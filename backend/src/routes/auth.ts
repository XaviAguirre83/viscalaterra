import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { signaToken } from '../auth/jwt'
import { requereixAuth, type RequestAmbUsuari } from '../auth/middleware'
import {
  buscaPerId,
  buscaPerEmail,
  buscaPerGoogleId,
  creaLocal,
  creaGoogle,
  vinculaGoogle,
  type UsuariPublic,
} from '../auth/usuaris'

const router = Router()

// Rate limiting més estricte que el global: protegeix contra força bruta de
// contrasenyes i abús del registre.
router.use(
  rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Client de Google només si hi ha Client ID configurat (si no, l'endpoint /google
// respon 503 i la resta d'auth segueix funcionant).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_CONTRASENYA = 8
// bcrypt només considera els primers 72 bytes; acceptar més enganya l'usuari
// (creuria tenir una contrasenya més llarga del que realment es verifica).
const MAX_CONTRASENYA = 72

// Hash esquer per al login quan l'email no existeix: es paga el mateix cost de
// bcrypt que amb un compte real, i la latència no revela quins emails hi ha
// registrats (timing attack d'enumeració d'usuaris).
const HASH_ESQUER = bcrypt.hashSync('contrasenya-esquer-anti-timing', 10)

function normalitzaEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

function resposta(res: Response, usuari: UsuariPublic): void {
  res.json({ token: signaToken(usuari.id), usuari })
}

// ── Registre (compte local email + contrasenya) ───────────────────────────
router.post('/registre', async (req: Request, res: Response) => {
  const nom = typeof req.body?.nom === 'string' ? req.body.nom.trim() : ''
  const email = normalitzaEmail(req.body?.email)
  const contrasenya = typeof req.body?.contrasenya === 'string' ? req.body.contrasenya : ''

  if (!nom) return res.status(400).json({ codi: 'nom_obligatori' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ codi: 'email_no_valid' })
  if (contrasenya.length < MIN_CONTRASENYA) {
    return res.status(400).json({ codi: 'contrasenya_curta' })
  }
  if (contrasenya.length > MAX_CONTRASENYA) {
    return res.status(400).json({ codi: 'contrasenya_llarga' })
  }

  if (await buscaPerEmail(email)) {
    return res.status(409).json({ codi: 'email_duplicat' })
  }

  const hash = await bcrypt.hash(contrasenya, 10)
  const usuari = await creaLocal(nom, email, hash)
  return resposta(res, usuari)
})

// ── Login (compte local) ──────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const email = normalitzaEmail(req.body?.email)
  const contrasenya = typeof req.body?.contrasenya === 'string' ? req.body.contrasenya : ''

  const usuari = await buscaPerEmail(email)
  if (!usuari || !usuari.password_hash) {
    // Compte inexistent o creat només amb Google: codi genèric per no revelar
    // quins emails estan registrats, i comparació contra un hash esquer perquè
    // la latència sigui la mateixa que amb un compte real (anti-timing).
    await bcrypt.compare(contrasenya, HASH_ESQUER)
    return res.status(401).json({ codi: 'credencials_incorrectes' })
  }
  const correcte = await bcrypt.compare(contrasenya, usuari.password_hash)
  if (!correcte) return res.status(401).json({ codi: 'credencials_incorrectes' })

  return resposta(res, {
    id: usuari.id,
    nom: usuari.nom,
    email: usuari.email,
    proveidor: usuari.proveidor,
    nivell: usuari.nivell,
    reputacio: usuari.reputacio,
  })
})

// ── Login / registre amb Google ───────────────────────────────────────────
router.post('/google', async (req: Request, res: Response) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(503).json({ codi: 'google_no_configurat' })
  }
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
  if (!credential) return res.status(400).json({ codi: 'google_falta_credential' })

  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()
  } catch {
    return res.status(401).json({ codi: 'google_token_no_valid' })
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return res.status(401).json({ codi: 'google_no_verificat' })
  }
  const googleId = payload.sub
  const email = payload.email.toLowerCase()
  const nom = payload.name?.trim() || (email.split('@')[0] ?? 'Usuari')

  // 1) Ja vinculat amb Google → entra.
  let usuari = await buscaPerGoogleId(googleId)
  if (!usuari) {
    // 2) Compte local amb el mateix email → vincula Google a aquest compte.
    const existent = await buscaPerEmail(email)
    if (existent) {
      await vinculaGoogle(existent.id, googleId)
      usuari = {
        id: existent.id,
        nom: existent.nom,
        email: existent.email,
        proveidor: existent.proveidor,
        nivell: existent.nivell,
        reputacio: existent.reputacio,
      }
    } else {
      // 3) Usuari nou.
      usuari = await creaGoogle(nom, email, googleId)
    }
  }
  return resposta(res, usuari)
})

// ── Usuari actual (a partir del token) ─────────────────────────────────────
router.get('/jo', requereixAuth, async (req: RequestAmbUsuari, res: Response) => {
  const usuari = await buscaPerId(req.idUsuari as number)
  if (!usuari) return res.status(404).json({ codi: 'usuari_no_trobat' })
  return res.json({ usuari })
})

export default router

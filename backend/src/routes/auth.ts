import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { NOM_COOKIE, obreSessio, tancaSessio, usuariDeLaSessio } from '../auth/sessio'
import {
  buscaPerEmail,
  buscaPerGoogleId,
  creaLocal,
  creaGoogle,
  publicDe,
  vinculaGoogle,
  type UsuariSessio,
} from '../auth/usuaris'

const router = Router()

// Rate limiting més estricte que el global: protegeix contra força bruta de
// contrasenyes i abús del registre. Només a les rutes que proven credencials o
// creen comptes: /jo es consulta a cada càrrega de la pàgina i no ha de gastar
// aquest cupó.
const limitAuth = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
  standardHeaders: true,
  legacyHeaders: false,
})

// Respostes per usuari (i amb Set-Cookie): cap caché, ni la del navegador ni la
// d'un proxy o CDN que es posi davant algun dia.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

// Client de Google només si hi ha Client ID configurat (si no, l'endpoint /google
// respon 503 i la resta d'auth segueix funcionant).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Límit pràctic d'una adreça de correu (RFC 5321).
const MAX_EMAIL = 254
const MAX_NOM = 80
const MIN_CONTRASENYA = 8
// bcrypt només considera els primers 72 BYTES; acceptar més enganya l'usuari
// (creuria tenir una contrasenya més llarga del que realment es verifica). Es
// compten bytes UTF-8, no caràcters: una lletra amb accent n'ocupa 2, un emoji 4.
const MAX_CONTRASENYA_BYTES = 72

// Codi de PostgreSQL per a una clau única duplicada.
const PG_UNIQUE_VIOLATION = '23505'

// Hash esquer per al login quan l'email no existeix: es paga el mateix cost de
// bcrypt que amb un compte real, i la latència no revela quins emails hi ha
// registrats (timing attack d'enumeració d'usuaris).
const HASH_ESQUER = bcrypt.hashSync('contrasenya-esquer-anti-timing', 10)

function normalitzaEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

// Obre la sessió (cookie HttpOnly) i retorna l'usuari (només els camps públics).
// El token no va al cos: el JavaScript de la pàgina no l'ha de veure mai.
function resposta(res: Response, usuari: UsuariSessio): void {
  obreSessio(res, usuari)
  res.json({ usuari: publicDe(usuari) })
}

// ── Registre (compte local email + contrasenya) ───────────────────────────
router.post('/registre', limitAuth, async (req: Request, res: Response) => {
  const nom = typeof req.body?.nom === 'string' ? req.body.nom.trim() : ''
  const email = normalitzaEmail(req.body?.email)
  const contrasenya = typeof req.body?.contrasenya === 'string' ? req.body.contrasenya : ''

  if (!nom) return res.status(400).json({ codi: 'nom_obligatori' })
  if (nom.length > MAX_NOM) return res.status(400).json({ codi: 'nom_llarg' })
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return res.status(400).json({ codi: 'email_no_valid' })
  }
  if (contrasenya.length < MIN_CONTRASENYA) {
    return res.status(400).json({ codi: 'contrasenya_curta' })
  }
  if (Buffer.byteLength(contrasenya, 'utf8') > MAX_CONTRASENYA_BYTES) {
    return res.status(400).json({ codi: 'contrasenya_llarga' })
  }

  if (await buscaPerEmail(email)) {
    return res.status(409).json({ codi: 'email_duplicat' })
  }

  const hash = await bcrypt.hash(contrasenya, 10)
  try {
    const usuari = await creaLocal(nom, email, hash)
    return resposta(res, usuari)
  } catch (err) {
    // Dos registres simultanis del mateix email: tots dos passen la comprovació
    // d'abans i el segon topa amb la clau única. És un duplicat, no un error intern.
    if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
      return res.status(409).json({ codi: 'email_duplicat' })
    }
    throw err
  }
})

// ── Login (compte local) ──────────────────────────────────────────────────
router.post('/login', limitAuth, async (req: Request, res: Response) => {
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

  return resposta(res, usuari)
})

// ── Login / registre amb Google ───────────────────────────────────────────
router.post('/google', limitAuth, async (req: Request, res: Response) => {
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
  const nom = (payload.name?.trim() || (email.split('@')[0] ?? 'Usuari')).slice(0, MAX_NOM)

  // 1) Ja vinculat amb Google → entra.
  let usuari = await buscaPerGoogleId(googleId)
  if (!usuari) {
    const existent = await buscaPerEmail(email)
    if (existent) {
      // 2) Compte amb el mateix email → s'hi vincula Google, i s'anul·len la
      //    contrasenya (no verificada) i les sessions obertes: vegeu vinculaGoogle.
      usuari = await vinculaGoogle(existent.id, googleId)
    } else {
      // 3) Usuari nou.
      usuari = await creaGoogle(nom, email, googleId)
    }
  }
  return resposta(res, usuari)
})

// ── Usuari actual (a partir de la cookie de sessió) ───────────────────────
// El frontend el consulta a cada arrencada: el JS no pot llegir la cookie
// HttpOnly per saber si hi ha sessió. Sense sessió respon 200 amb usuari null
// (no 401), perquè cada visitant anònim no deixi un error a la consola.
router.get('/jo', async (req: Request, res: Response) => {
  const usuari = await usuariDeLaSessio(req)
  // Cookie caducada, manipulada, revocada o d'un usuari que ja no existeix:
  // s'esborra perquè el navegador no la torni a enviar.
  if (!usuari && req.headers.cookie?.includes(NOM_COOKIE)) tancaSessio(res)
  return res.json({ usuari })
})

// ── Tancar sessió ──────────────────────────────────────────────────────────
// La cookie és HttpOnly: el JS no la pot esborrar, ho ha de fer el servidor.
router.post('/surt', (_req: Request, res: Response) => {
  tancaSessio(res)
  res.status(204).end()
})

export default router

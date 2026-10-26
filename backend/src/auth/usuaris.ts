import { pool } from '../db'

// Dades de l'usuari que SÍ es poden exposar al client (mai el password_hash).
export interface UsuariPublic {
  id: number
  nom: string
  email: string
  proveidor: string
  nivell: string
  reputacio: number
}

// Usuari amb la seva versió de sessió (migració 001), per obrir una sessió o
// validar-ne una. Mai surt cap al client: vegeu publicDe.
export interface UsuariSessio extends UsuariPublic {
  sessio_versio: number
}

// Fila interna amb el hash, només per a la validació del login local.
interface UsuariAmbHash extends UsuariSessio {
  password_hash: string | null
  google_id: string | null
}

const CAMPS_PUBLICS = 'id, nom, email, proveidor, nivell, reputacio'
const CAMPS_SESSIO = `${CAMPS_PUBLICS}, sessio_versio`

// Només els camps públics (sense la versió de sessió, el hash…).
export function publicDe(u: UsuariPublic): UsuariPublic {
  return {
    id: u.id,
    nom: u.nom,
    email: u.email,
    proveidor: u.proveidor,
    nivell: u.nivell,
    reputacio: u.reputacio,
  }
}

export async function buscaPerId(id: number): Promise<UsuariSessio | null> {
  const { rows } = await pool.query<UsuariSessio>(
    `SELECT ${CAMPS_SESSIO} FROM usuaris WHERE id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function buscaPerEmail(email: string): Promise<UsuariAmbHash | null> {
  const { rows } = await pool.query<UsuariAmbHash>(
    `SELECT ${CAMPS_SESSIO}, password_hash, google_id FROM usuaris WHERE email = $1`,
    [email]
  )
  return rows[0] ?? null
}

export async function buscaPerGoogleId(googleId: string): Promise<UsuariSessio | null> {
  const { rows } = await pool.query<UsuariSessio>(
    `SELECT ${CAMPS_SESSIO} FROM usuaris WHERE google_id = $1`,
    [googleId]
  )
  return rows[0] ?? null
}

export async function creaLocal(
  nom: string,
  email: string,
  passwordHash: string
): Promise<UsuariSessio> {
  const { rows } = await pool.query<UsuariSessio>(
    `INSERT INTO usuaris (nom, email, password_hash, proveidor)
     VALUES ($1, $2, $3, 'local') RETURNING ${CAMPS_SESSIO}`,
    [nom, email, passwordHash]
  )
  return rows[0]
}

export async function creaGoogle(
  nom: string,
  email: string,
  googleId: string
): Promise<UsuariSessio> {
  const { rows } = await pool.query<UsuariSessio>(
    `INSERT INTO usuaris (nom, email, google_id, proveidor)
     VALUES ($1, $2, $3, 'google') RETURNING ${CAMPS_SESSIO}`,
    [nom, email, googleId]
  )
  return rows[0]
}

// Vincula un compte existent amb el Google del mateix email (verificat per Google).
// El registre local no verifica l'email: algú podria haver registrat el d'una altra
// persona amb una contrasenya seva i, en vincular-s'hi la persona real amb Google,
// conservar-hi l'accés (pre-hijacking). Per això es canvien els panys: s'anul·la la
// contrasenya i s'incrementa la versió de sessió, que tanca totes les sessions
// obertes. A partir d'aquí s'hi entra amb Google. (Quan hi hagi verificació d'email
// es podrà conservar la contrasenya dels comptes amb l'email ja verificat.)
export async function vinculaGoogle(id: number, googleId: string): Promise<UsuariSessio> {
  const { rows } = await pool.query<UsuariSessio>(
    `UPDATE usuaris
        SET google_id = $1, password_hash = NULL, proveidor = 'google',
            sessio_versio = sessio_versio + 1
      WHERE id = $2
      RETURNING ${CAMPS_SESSIO}`,
    [googleId, id]
  )
  return rows[0]
}

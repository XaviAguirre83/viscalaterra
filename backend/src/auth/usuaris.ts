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

// Fila interna amb el hash, només per a la validació del login local.
interface UsuariAmbHash extends UsuariPublic {
  password_hash: string | null
  google_id: string | null
}

const CAMPS_PUBLICS = 'id, nom, email, proveidor, nivell, reputacio'

export async function buscaPerId(id: number): Promise<UsuariPublic | null> {
  const { rows } = await pool.query<UsuariPublic>(
    `SELECT ${CAMPS_PUBLICS} FROM usuaris WHERE id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function buscaPerEmail(email: string): Promise<UsuariAmbHash | null> {
  const { rows } = await pool.query<UsuariAmbHash>(
    `SELECT ${CAMPS_PUBLICS}, password_hash, google_id FROM usuaris WHERE email = $1`,
    [email]
  )
  return rows[0] ?? null
}

export async function buscaPerGoogleId(googleId: string): Promise<UsuariPublic | null> {
  const { rows } = await pool.query<UsuariPublic>(
    `SELECT ${CAMPS_PUBLICS} FROM usuaris WHERE google_id = $1`,
    [googleId]
  )
  return rows[0] ?? null
}

export async function creaLocal(
  nom: string,
  email: string,
  passwordHash: string
): Promise<UsuariPublic> {
  const { rows } = await pool.query<UsuariPublic>(
    `INSERT INTO usuaris (nom, email, password_hash, proveidor)
     VALUES ($1, $2, $3, 'local') RETURNING ${CAMPS_PUBLICS}`,
    [nom, email, passwordHash]
  )
  return rows[0]
}

export async function creaGoogle(
  nom: string,
  email: string,
  googleId: string
): Promise<UsuariPublic> {
  const { rows } = await pool.query<UsuariPublic>(
    `INSERT INTO usuaris (nom, email, google_id, proveidor)
     VALUES ($1, $2, $3, 'google') RETURNING ${CAMPS_PUBLICS}`,
    [nom, email, googleId]
  )
  return rows[0]
}

// Vincula un compte local existent amb el seu Google (mateix email verificat).
export async function vinculaGoogle(id: number, googleId: string): Promise<void> {
  await pool.query(`UPDATE usuaris SET google_id = $1 WHERE id = $2`, [googleId, id])
}

import jwt from 'jsonwebtoken'

// Secret i caducitat venen de l'entorn (.env). Sense secret no s'arrenca:
// signar tokens amb un valor per defecte seria un forat de seguretat.
const SECRET = process.env.JWT_SECRET
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

if (!SECRET) {
  throw new Error("JWT_SECRET no està definit a l'entorn")
}

// Claim propi (uid) en lloc del registrat "sub", que jsonwebtoken obliga a ser
// string; així evitem conversions i ambigüitats amb l'id numèric.
export interface PayloadToken {
  uid: number
}

export function signaToken(idUsuari: number): string {
  const opcions: jwt.SignOptions = { expiresIn: EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  return jwt.sign({ uid: idUsuari }, SECRET as jwt.Secret, opcions)
}

export function verificaToken(token: string): PayloadToken | null {
  try {
    const dades = jwt.verify(token, SECRET as jwt.Secret)
    if (typeof dades === 'object' && dades !== null && typeof dades.uid === 'number') {
      return { uid: dades.uid }
    }
    return null
  } catch {
    return null
  }
}

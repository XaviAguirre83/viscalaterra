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

// Retorna també quan caduca: la cookie de sessió (sessio.ts) caduca al mateix
// moment que el token, sigui quin sigui el format de JWT_EXPIRES_IN.
export function signaToken(idUsuari: number): { token: string; caduca: Date } {
  const opcions: jwt.SignOptions = {
    expiresIn: EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  }
  const token = jwt.sign({ uid: idUsuari }, SECRET as jwt.Secret, opcions)
  // `exp` (segons des de 1970) l'acaba de calcular jwt.sign a partir d'expiresIn.
  const { exp } = jwt.decode(token) as { exp: number }
  return { token, caduca: new Date(exp * 1000) }
}

export function verificaToken(token: string): PayloadToken | null {
  try {
    // Algorisme fixat explícitament: defensa en profunditat contra confusió
    // d'algorismes (no acceptar mai tokens signats amb un altre esquema).
    const dades = jwt.verify(token, SECRET as jwt.Secret, { algorithms: ['HS256'] })
    if (typeof dades === 'object' && dades !== null && typeof dades.uid === 'number') {
      return { uid: dades.uid }
    }
    return null
  } catch {
    return null
  }
}

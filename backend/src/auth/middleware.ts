import type { Request, Response, NextFunction } from 'express'
import { verificaToken } from './jwt'

// Request enriquida amb l'id de l'usuari autenticat (l'omple el middleware).
export interface RequestAmbUsuari extends Request {
  idUsuari?: number
}

// Exigeix un Bearer token vàlid; si no, talla amb 401. Posa req.idUsuari.
export function requereixAuth(req: RequestAmbUsuari, res: Response, next: NextFunction): void {
  const capçalera = req.headers.authorization
  const token = capçalera?.startsWith('Bearer ') ? capçalera.slice(7) : null
  if (!token) {
    res.status(401).json({ codi: 'no_autenticat' })
    return
  }
  const payload = verificaToken(token)
  if (!payload) {
    res.status(401).json({ codi: 'token_no_valid' })
    return
  }
  req.idUsuari = payload.uid
  next()
}

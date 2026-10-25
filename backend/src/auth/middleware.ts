import type { Request, Response, NextFunction } from 'express'
import { idDeLaSessio } from './sessio'

// Request enriquida amb l'id de l'usuari autenticat (l'omple el middleware).
export interface RequestAmbUsuari extends Request {
  idUsuari?: number
}

// Exigeix una sessió vàlida (cookie HttpOnly, vegeu sessio.ts); si no, talla amb
// 401. Posa req.idUsuari. Per a les rutes que només té sentit fer amb sessió.
export function requereixAuth(req: RequestAmbUsuari, res: Response, next: NextFunction): void {
  const id = idDeLaSessio(req)
  if (id === null) {
    res.status(401).json({ codi: 'no_autenticat' })
    return
  }
  req.idUsuari = id
  next()
}

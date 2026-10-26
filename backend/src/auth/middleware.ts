import type { Request, Response, NextFunction } from 'express'
import { usuariDeLaSessio } from './sessio'

// Request enriquida amb l'id de l'usuari autenticat (l'omple el middleware).
export interface RequestAmbUsuari extends Request {
  idUsuari?: number
}

// Exigeix una sessió vàlida i no revocada (cookie HttpOnly, vegeu sessio.ts); si
// no, talla amb 401. Posa req.idUsuari. Per a les rutes que només té sentit fer
// amb sessió.
export async function requereixAuth(
  req: RequestAmbUsuari,
  res: Response,
  next: NextFunction
): Promise<void> {
  const usuari = await usuariDeLaSessio(req)
  if (!usuari) {
    res.status(401).json({ codi: 'no_autenticat' })
    return
  }
  req.idUsuari = usuari.id
  next()
}

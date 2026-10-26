import type { Request, Response } from 'express'
import { signaToken, verificaToken } from './jwt'
import { buscaPerId, publicDe, type UsuariPublic, type UsuariSessio } from './usuaris'

// La sessió viatja en una cookie HttpOnly que posa i esborra el servidor, no en
// una capçalera que hagi de posar el JavaScript de la pàgina:
//   - el JS no la pot llegir, i per tant un XSS no la pot robar;
//   - deixa lliure la capçalera Authorization per a la contrasenya HTTP de la
//     porta de staging (basic auth de Caddy). Amb el token a `Authorization:
//     Bearer` no hi cabien tots dos i cada recàrrega tancava la sessió.

// Secure (només per HTTPS): per defecte a producció. En dev el web va per HTTP
// (també des del mòbil per la LAN) i el navegador rebutjaria una cookie Secure.
// COOKIE_SECURE=true|false ho força (p. ex. per provar el stack de producció
// per HTTP des d'una IP de la LAN).
const SEGURA = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production'

// El prefix __Host- fa que el navegador exigeixi Secure, Path=/ i cap Domain: un
// subdomini (p. ex. staging.) no pot plantar ni sobreescriure la cookie d'un
// altre. Sense Secure el navegador rebutjaria el prefix: en dev, nom pla.
export const NOM_COOKIE = SEGURA ? '__Host-sessio' : 'sessio'

// SameSite=Strict: el navegador no l'envia mai en peticions iniciades des d'una
// altra web (CSRF). L'SPA fa totes les crides a l'API des de la seva pròpia
// pàgina, així que ni arribar-hi des d'un enllaç extern no la necessita.
const OPCIONS = { httpOnly: true, secure: SEGURA, sameSite: 'strict', path: '/' } as const

export function obreSessio(res: Response, usuari: UsuariSessio): void {
  const { token, caduca } = signaToken(usuari.id, usuari.sessio_versio)
  res.cookie(NOM_COOKIE, token, { ...OPCIONS, expires: caduca })
}

export function tancaSessio(res: Response): void {
  res.clearCookie(NOM_COOKIE, OPCIONS)
}

// Usuari de la cookie de sessió, o null si no n'hi ha o no és vàlida: caducada,
// manipulada, signada amb un altre JWT_SECRET, d'un usuari que ja no existeix o
// revocada (la versió de sessió de la BD ha canviat des que es va obrir). Fa una
// consulta a la BD a cada crida: és el preu de poder tancar sessions a distància.
export async function usuariDeLaSessio(req: Request): Promise<UsuariPublic | null> {
  const token = llegeixCookie(req, NOM_COOKIE)
  const payload = token ? verificaToken(token) : null
  if (!payload) return null
  const usuari = await buscaPerId(payload.uid)
  if (!usuari || usuari.sessio_versio !== payload.sv) return null
  return publicDe(usuari)
}

// Lector mínim de la capçalera Cookie ("a=1; b=2"): no val la pena una
// dependència per llegir-ne una sola.
function llegeixCookie(req: Request, nom: string): string | null {
  for (const tros of req.headers.cookie?.split(';') ?? []) {
    const i = tros.indexOf('=')
    if (i > 0 && tros.slice(0, i).trim() === nom) {
      try {
        return decodeURIComponent(tros.slice(i + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

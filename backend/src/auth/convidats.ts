import { pool } from '../db'

// Qui pot crear un compte nou. REGISTRE=obert: qualsevol. Qualsevol altre valor
// (o cap): només els emails de la taula `convidats` (migració 002). Tancat per
// defecte: si algú s'oblida de configurar-ho, no es crea cap compte que no toqui.
// Només afecta la creació de comptes; els que ja existeixen entren igual.
const REGISTRE_OBERT = process.env.REGISTRE === 'obert'

// `email` ja normalitzat (minúscules, sense espais), com es desa a `usuaris`.
export async function potRegistrarSe(email: string): Promise<boolean> {
  if (REGISTRE_OBERT) return true
  const { rows } = await pool.query('SELECT 1 FROM convidats WHERE email = $1', [email])
  return rows.length > 0
}

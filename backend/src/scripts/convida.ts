// Gestiona la llista blanca del registre per invitació (taula `convidats`,
// migració 002): els emails que poden crear un compte mentre el backend corre amb
// REGISTRE=invitacio (vegeu auth/convidats.ts).
//
// Ús (dins backend/, o via docker exec al contenidor):
//   npm run convida                               → mostra la llista
//   npm run convida -- oriol@example.com "Oriol"  → hi apunta l'email (nota opcional)
//   npm run convida -- --treu oriol@example.com   → el treu de la llista
// Al servidor: node dist/scripts/convida.js …
//
// Treure un email només impedeix crear el compte: si ja el va crear, segueix existint.

import { pool } from '../db'

// La mateixa forma mínima que exigeix el registre (routes/auth.ts).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Com es desa a `usuaris` i com el compara el registre: minúscules, sense espais.
function emailDe(v: string | undefined): string {
  const email = (v ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) throw new Error(`No sembla un email: «${v ?? ''}»`)
  return email
}

async function llista() {
  const { rows } = await pool.query<{ email: string; nota: string | null; te_compte: boolean }>(
    `SELECT c.email, c.nota, u.id IS NOT NULL AS te_compte
       FROM convidats c LEFT JOIN usuaris u ON u.email = c.email
      ORDER BY c.creat_en`
  )
  if (rows.length === 0) console.log('La llista és buida: ningú no es pot registrar.')
  for (const r of rows) {
    console.log(`${r.te_compte ? '✔' : '·'} ${r.email}${r.nota ? `  (${r.nota})` : ''}`)
  }
  if (rows.length > 0) console.log('\n✔ ja té compte · encara no s’ha registrat')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) return llista()

  if (args[0] === '--treu') {
    const email = emailDe(args[1])
    const { rowCount } = await pool.query('DELETE FROM convidats WHERE email = $1', [email])
    console.log(rowCount ? `Tret de la llista: ${email}` : `No era a la llista: ${email}`)
    return
  }

  const email = emailDe(args[0])
  const nota = args.slice(1).join(' ').trim() || null
  await pool.query(
    `INSERT INTO convidats (email, nota) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET nota = COALESCE(EXCLUDED.nota, convidats.nota)`,
    [email, nota]
  )
  console.log(`Convidat: ${email}${nota ? ` (${nota})` : ''}`)
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    void pool.end().finally(() => process.exit(1))
  })

import { Pool } from 'pg'

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'viscalaterra',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Sense aquest listener, un client idle que perd la connexió (reinici de la BD,
// tall de xarxa) emet 'error' sense gestor i MATA el procés Node sencer.
pool.on('error', (err) => {
  console.error('Error en client idle de Postgres (client descartat):', err.message)
})

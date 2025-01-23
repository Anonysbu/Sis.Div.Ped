import { Pool } from "pg"

let pool: Pool | null = null

if (typeof window === "undefined") {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })
}

export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error("Database connection not established")
  }
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function initDB() {
  if (!pool) {
    throw new Error("Database connection not established")
  }
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS contratos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS itens (
      id SERIAL PRIMARY KEY,
      contrato_id INTEGER REFERENCES contratos(id),
      nome VARCHAR(255) NOT NULL,
      unidade VARCHAR(50) NOT NULL,
      valor_unitario DECIMAL(10, 2) NOT NULL,
      recursos_elegiveis TEXT NOT NULL
    );
  `
  await query(createTablesQuery)
}


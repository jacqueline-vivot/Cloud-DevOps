import pg from 'pg';

const { Pool } = pg;

export class DatabaseUnavailableError extends Error {
  constructor(cause) {
    super('Banco de dados indisponível', { cause });
    this.name = 'DatabaseUnavailableError';
  }
}

export function createDatabasePool(config = {}) {
  return new Pool({
    host: config.host ?? process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(config.port ?? process.env.DATABASE_PORT) || 5432,
    database: config.database ?? process.env.DATABASE_NAME,
    user: config.user ?? process.env.DATABASE_USER,
    password: config.password ?? process.env.DATABASE_PASSWORD,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
  });
}

export async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      produto_id TEXT NOT NULL,
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      cliente TEXT,
      status TEXT NOT NULL DEFAULT 'criado',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function queryDatabase(pool, text, values = []) {
  try {
    return await pool.query(text, values);
  } catch (error) {
    throw new DatabaseUnavailableError(error);
  }
}


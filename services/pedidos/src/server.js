import 'dotenv/config';
import './telemetry.js';
import { buildApp } from './app.js';
import { createDatabasePool, initializeDatabase } from './database.js';

const pool = createDatabasePool();
const app = buildApp(pool);
const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

try {
  await initializeDatabase(pool);
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}

async function shutdown(signal) {
  app.log.info({ signal }, 'Encerrando serviço');
  await app.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

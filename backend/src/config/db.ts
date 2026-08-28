import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('⚡ Conectado a la base de datos PostgreSQL/Docker');
});

pool.on('error', (err) => {
  console.error(' Error inesperado en el cliente de base de datos:', err);
});
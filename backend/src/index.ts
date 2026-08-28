import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rutas base de la API
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/api/v1/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'Sistema de Administración Edificio XYZ - API Activa',
      db_time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'Error de conexión a la BD', error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
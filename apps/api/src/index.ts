// apps/api/src/index.ts
// Entry point del servidor Express — Edificio XYZ API

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { router } from './routes';
import { errorMiddleware } from './middlewares/error.middleware';

const app: Application = express();

// ── Middlewares de seguridad y parsing ───────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging en desarrollo ────────────────────────────────────────────────────
if (config.isDev) {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// ── Rutas de la API ──────────────────────────────────────────────────────────
app.use('/api/v1', router);

// Ruta raíz informativa
app.get('/', (_req, res) => {
  res.json({
    service: 'Edificio XYZ API',
    version: '1.0.0',
    docs: '/api/v1/health',
    endpoints: [
      'GET  /api/v1/health',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/logout',
      'GET  /api/v1/auth/me',
      'GET  /api/v1/departamentos',
      'GET  /api/v1/expensas',
      'GET  /api/v1/movimientos',
      'GET  /api/v1/movimientos/resumen',
      'GET  /api/v1/comunicados',
      'GET  /api/v1/personal',
    ],
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.method} ${req.path} no existe en esta API`,
    hint: 'Consulte GET / para ver los endpoints disponibles',
  });
});

// ── Error handler global (DEBE ser el último middleware) ─────────────────────
app.use(errorMiddleware);

// ── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log('');
  console.log('🏢 ═══════════════════════════════════════════════');
  console.log(`   Edificio XYZ API — v1.0.0`);
  console.log(`   🚀 http://localhost:${config.port}`);
  console.log(`   📦 Ambiente: ${config.nodeEnv}`);
  console.log(`   🌐 CORS: ${config.corsOrigin}`);
  console.log('   ═══════════════════════════════════════════════');
  console.log('');
});

export { app };

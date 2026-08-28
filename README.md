# Sistema de Administración Edificio XYZ

## Requisitos
* Git
* Docker Desktop
* Node.js 20+
* pnpm (`npm install -g pnpm`)

## Entorno Local

### 1. Base de datos
```
docker compose up -d
```
Esto levanta PostgreSQL en el puerto 5432 y carga automáticamente el schema (`database/migrations/001_initial_schema.sql`) y los datos semilla (`database/seeds/001_seed_data.sql`).

Para detener los servicios:
```
docker compose down
```
Para reiniciar la base de datos desde cero (borra los datos):
```
docker compose down -v
docker compose up -d
```

### 2. Backend
```
cd backend
cp .env.example .env
pnpm install
pnpm dev
```
El servidor queda disponible en `http://localhost:4000`.

- Health check: `GET http://localhost:4000/api/v1/health`
- Login: `POST http://localhost:4000/api/v1/auth/login` con body `{ "email": "...", "password": "..." }`

Usuarios de prueba (ver `database/seeds/001_seed_data.sql`):
- admin@edificioxyz.com
- directorio@edificioxyz.com
- consulta@edificioxyz.com

### 3. Frontend
```
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```
App disponible en `http://localhost:5173`. Requiere el backend corriendo (paso 2). Detalles en `frontend/README.md`.
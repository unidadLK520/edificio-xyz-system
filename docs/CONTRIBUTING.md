# Guía de Contribución — Edificio XYZ System

## Requisitos previos

- **Node.js 20+**
- **pnpm 10+** — `npm install -g pnpm`
- **Docker Desktop** — para PostgreSQL
- **Git**

---

## Setup inicial (una sola vez)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd edificio-xyz-system

# 2. Instalar dependencias de todo el monorepo
pnpm install

# 3. Levantar la base de datos
docker compose up -d

# 4. Generar el cliente Prisma y sincronizar schema
pnpm db:generate
pnpm db:push

# 5. Cargar datos de prueba
pnpm db:seed

# 6. Copiar variables de entorno
cp .env.example frontend/.env
cp backend/.env.example backend/.env
```

---

## Flujo de desarrollo

### Iniciar todo el stack
```bash
pnpm dev
# → Frontend en http://localhost:3000
# → Backend API en http://localhost:4000
```

### Solo el frontend
```bash
pnpm web:dev
```

### Solo el backend
```bash
pnpm api:dev
```

### Explorar la base de datos
```bash
pnpm db:studio
# → Prisma Studio en http://localhost:5555
```

---

## Estructura del monorepo

```
edificio-xyz-system/
├── backend/          ← Express + TypeScript (REST API, puerto 4000)
├── frontend/         ← Next.js 15 (React 19, Tailwind, Server Components, puerto 3000)
├── packages/
│   ├── database/     ← Prisma ORM + Schema + Seed
│   └── typescript-config/  ← tsconfigs compartidos
├── database/
│   └── migrations/   ← SQL de migración inicial
└── docs/             ← Documentación técnica
```

---

## Convenciones de código

### General
- **TypeScript strict** en todos los paquetes
- **No usar `any`** — tipar correctamente o usar `unknown`
- Comentarios en **español** (es el idioma del dominio)
- Nombres de variables/funciones en **inglés** (estándar de código)

### Git
- Ramas: `feature/nombre-descripcion`, `fix/nombre-bug`, `chore/tarea`
- Commits en español: `feat: agregar endpoint de pagos`, `fix: corregir cálculo de mora`
- **No hacer push directo a `main`** — usar Pull Requests

### Backend (backend)
- Validar **todas** las entradas con `zod`
- Usar **transacciones Prisma** para operaciones que afectan múltiples tablas
- Respuestas de error consistentes: `{ error, message, details? }`
- Respuestas paginadas: `{ data, meta: { total, page, limit, totalPages } }`

### Frontend (frontend)
- Preferir **Server Components** para data fetching
- Usar **Server Actions** para mutaciones
- Estilos con **Tailwind CSS**

---

## Credenciales de desarrollo

| Correo | Contraseña | Rol |
|--------|-----------|-----|
| `admin@edificioxyz.com` | `admin123` | Administrador |
| `directorio@edificioxyz.com` | `directorio123` | Directorio |
| `consulta@edificioxyz.com` | `consulta123` | Consulta |

---

## Comandos útiles

```bash
pnpm dev           # Todo el stack en desarrollo
pnpm build         # Compilar todo
pnpm lint          # Linter en todos los paquetes
pnpm db:generate   # Regenerar Prisma Client (tras cambiar schema)
pnpm db:push       # Sincronizar schema con la BD
pnpm db:seed       # Recargar datos de prueba
pnpm db:studio     # Explorador visual de BD
pnpm api:dev       # Solo el backend Express
pnpm web:dev       # Solo el frontend Next.js
```

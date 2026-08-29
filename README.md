# Sistema de Administración Edificio XYZ 🏢

Sistema integral para la administración de copropiedad, expensas, control financiero, residentes y mantenimiento para el **Edificio XYZ**.

Construido con una arquitectura moderna de **Monorepo (Turborepo + pnpm)**, **Next.js 15 (App Router)**, **React 19**, **Express + TypeScript REST API**, **Prisma ORM**, **PostgreSQL** y **Tailwind CSS**.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| **Monorepo** | [Turborepo](https://turbo.build/) | Orquestador de builds, pipelines y caché inteligente |
| **Package Manager** | [pnpm](https://pnpm.io/) | Gestor de paquetes rápido con soporte de workspaces |
| **Frontend UI** | [Next.js 15](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, Server Actions, SSR y componentes modernos |
| **Backend REST API** | [Express](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/) | API REST modular, middlewares de seguridad (Helmet, CORS, JWT) |
| **Estilos & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + Lucide Icons | Diseño responsivo, glassmorphism y paleta moderna |
| **ORM & Tipado** | [Prisma ORM](https://www.prisma.io/) | Modelado tipado en TypeScript con esquemas PostgreSQL |
| **Base de Datos** | [PostgreSQL 17](https://www.postgresql.org/) | Motor relacional multi-esquema (`edificio`, `public`) |
| **Infraestructura** | [Docker](https://www.docker.com/) | Contenedor local para PostgreSQL portable y reproducible |

---

## 🚀 Inicio Rápido

### 1. Requisitos
* [Node.js 20+](https://nodejs.org/)
* [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 2. Levantar la Base de Datos con Docker
Inicia el contenedor de PostgreSQL en segundo plano:
```bash
docker compose up -d
```
> Para reiniciar la base de datos limpia: `docker compose down -v && docker compose up -d`

---

### 3. Instalar Dependencias
Instala los paquetes en todo el monorepo mediante pnpm:
```bash
pnpm install
```

---

### 4. Configurar Variables de Entorno
Copia los archivos de ejemplo a sus respectivos `.env`:
```bash
# En Windows (PowerShell):
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env

# En Linux / macOS (Bash):
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

---

### 5. Sincronizar Prisma y Cargar Datos Iniciales (Seed)
Genera el cliente tipado de Prisma y carga los datos de prueba:
```bash
# Genera el cliente Prisma
pnpm db:generate

# Aplica el esquema a la base de datos
pnpm db:push

# Carga roles, usuarios iniciales, copropietarios, departamentos y expensas
pnpm db:seed
```

---

### 6. Iniciar Servidores de Desarrollo
Ejecuta todo el stack con Turborepo:
```bash
pnpm dev
```

* **Frontend Web:** [`http://localhost:3000`](http://localhost:3000)
* **Backend REST API:** [`http://localhost:4000`](http://localhost:4000)
* **API Health Check:** [`http://localhost:4000/api/v1/health`](http://localhost:4000/api/v1/health)

---

## 🔑 Credenciales de Acceso de Prueba

El sistema incluye usuarios preconfigurados con contraseñas seguras (hasheadas con bcrypt):

| Correo | Contraseña | Rol | Acceso |
|---|---|---|---|
| `admin@edificioxyz.com` | `admin123` | **Administrador** | Acceso total al sistema |
| `directorio@edificioxyz.com` | `directorio123` | **Directorio** | Reportes financieros y aprobaciones |
| `consulta@edificioxyz.com` | `consulta123` | **Consulta** | Visualización de avisos y estados |

*(La pantalla de login incluye botones de autocompletado rápido para facilitar las pruebas en desarrollo).*

---

## 📁 Estructura del Monorepo

```
edificio-xyz-system/
├── backend/                         # Backend REST API Express + TypeScript
│   ├── src/
│   │   ├── index.ts                 # Entry point del servidor Express
│   │   ├── config.ts                # Configuración y variables de entorno
│   │   ├── middlewares/             # Middlewares de autenticación JWT y manejo de errores
│   │   └── routes/                  # Routers por dominio (auth, expensas, dptos, etc.)
│   ├── .env                         # Variables de entorno locales
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                        # Frontend Next.js 15 + React 19 + Tailwind CSS
│   ├── app/
│   │   ├── (auth)/login/            # Autenticación y Login
│   │   ├── (dashboard)/             # Portal administrativo y módulos
│   │   │   ├── expensas/            # Emisiones y cobros de expensas
│   │   │   ├── departamentos/       # Departamentos y copropietarios
│   │   │   ├── movimientos/         # Caja y finanzas
│   │   │   ├── comunicados/         # Tablón digital de avisos
│   │   │   └── personal/            # Empleados y sueldos
│   │   └── api/                     # Endpoints Next.js (auth, health)
│   ├── lib/                         # Helpers, JWT (jose) y utilidades
│   ├── .env                         # Variables de entorno locales
│   ├── package.json
│   └── next.config.ts
│
├── packages/
│   ├── database/                    # Prisma ORM + Esquema + Seeders + Singleton
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Esquema de datos PostgreSQL multi-schema
│   │   │   └── seed.ts              # Población completa de datos demo
│   │   └── src/index.ts             # Instancia exportable de PrismaClient
│   │
│   └── typescript-config/           # Tsconfigs compartidos en el monorepo
│
├── database/
│   └── migrations/                  # Script SQL inicial de base de datos
├── docker-compose.yml               # Orquestación de PostgreSQL
├── pnpm-workspace.yaml              # Definición de workspaces de pnpm (backend, frontend, packages/*)
├── turbo.json                       # Configuración de Turborepo
└── package.json                     # Scripts y dependencias raíz
```

---

## 🛠️ Comandos Globales Útiles

```bash
# Desarrollo
pnpm dev           # Inicia Next.js (3000) y la API Express (4000) en paralelo
pnpm web:dev       # Inicia únicamente el Frontend Next.js
pnpm api:dev       # Inicia únicamente el Backend API Express

# Construcción y Calidad
pnpm build         # Compila todos los proyectos y paquetes con Turborepo
pnpm lint          # Ejecuta verificación de tipos (tsc) en todos los paquetes

# Base de Datos y Prisma
pnpm db:generate   # Genera Prisma Client
pnpm db:push       # Sincroniza schema.prisma con la base de datos PostgreSQL
pnpm db:seed       # Ejecuta el seeder de base de datos
pnpm db:studio     # Abre Prisma Studio en http://localhost:5555 para explorar la BD
```
# Sistema de Administración Edificio XYZ 🏢

Sistema integral para la administración de copropiedad, expensas, control financiero, residentes y mantenimiento para el **Edificio XYZ**.

Construido con una arquitectura moderna de **Monorepo (Turborepo + pnpm)**, **Next.js 15 (App Router)**, **React 19**, **Prisma ORM**, **PostgreSQL** y **Tailwind CSS**.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| **Monorepo** | [Turborepo](https://turbo.build/) | Orquestador de builds, pipelines y caché inteligente |
| **Package Manager** | [pnpm](https://pnpm.io/) | Gestor de paquetes rápido con soporte de workspaces |
| **Fullstack / UI** | [Next.js 15](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, Server Actions, SSR y API Routes |
| **Estilos & UI** | [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons | Diseño responsivo, glassmorphism y paleta moderna |
| **ORM & Tipado** | [Prisma](https://www.prisma.io/) | Modelado tipado en TypeScript para PostgreSQL |
| **Base de Datos** | [PostgreSQL 17](https://www.postgresql.org/) | Motor relacional para todas las entidades |
| **Infraestructura** | [Docker](https://www.docker.com/) | Contenedor local para PostgreSQL portable |

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

### 4. Sincronizar Prisma y Cargar Datos Iniciales (Seed)
Genera el cliente tipado de Prisma y carga los datos de prueba:
```bash
# Genera el cliente Prisma
pnpm db:generate

# Aplica el esquema a la base de datos
pnpm db:push

# Carga roles, usuarios iniciales, departamentos y expensas
pnpm db:seed
```

---

### 5. Iniciar Servidor de Desarrollo
Ejecuta la aplicación web con Turborepo:
```bash
pnpm dev
```

La aplicación estará disponible en: **`http://localhost:3000`**

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

## 📁 Estructura del Proyecto

```
edificio-xyz-system/
├── apps/
│   └── web/                         # Aplicación Fullstack Next.js 15 + React + Tailwind
│       ├── app/
│       │   ├── (auth)/login/        # Autenticación y Login
│       │   ├── (dashboard)/         # Portal administrativo y módulos
│       │   │   ├── expensas/        # Emisiones y cobros de expensas
│       │   │   ├── departamentos/   # Departamentos y copropietarios
│       │   │   ├── movimientos/     # Caja y finanzas
│       │   │   ├── comunicados/     # Tablón digital de avisos
│       │   │   └── personal/        # Empleados y sueldos
│       │   └── api/                 # Endpoints REST (auth, health, v1)
│       └── lib/                     # Helpers, JWT (jose) y utilidades
│
├── packages/
│   ├── database/                    # Prisma ORM + Esquema + Seeders + Singleton
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Esquema de datos PostgreSQL
│   │   │   └── seed.ts              # Población de datos demo
│   │   └── src/index.ts             # Instancia exportable de PrismaClient
│   │
│   └── typescript-config/           # Tsconfigs compartidos en el monorepo
│
├── docker-compose.yml               # Orquestación de PostgreSQL
├── pnpm-workspace.yaml              # Definición de workspaces de pnpm
├── turbo.json                       # Configuración de Turborepo
└── package.json                     # Scripts y dependencias raíz
```

---

## 🛠️ Comandos Globales Útiles

```bash
pnpm dev           # Inicia Next.js y todos los paquetes en modo desarrollo
pnpm build         # Compila todos los proyectos y paquetes con Turborepo
pnpm lint          # Ejecuta el linter en todos los paquetes
pnpm db:generate   # Genera Prisma Client
pnpm db:push       # Sincroniza schema.prisma con la base de datos PostgreSQL
pnpm db:seed       # Ejecuta el seeder de base de datos
pnpm db:studio     # Abre Prisma Studio en http://localhost:5555 para explorar la BD
```
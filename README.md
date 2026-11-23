# Sistema de Administración Edificio XYZ 🏢

Sistema integral para la administración de copropiedad, gestión de expensas, control de cobros con QR, lectura y tarificación de agua, control financiero (ingresos, egresos, caja y bancos), conciliación bancaria, comunicados masivos, residentes y personal del **Edificio XYZ**.

Construido con una arquitectura moderna de **Monorepo (Turborepo + pnpm)**, **Next.js 15 (App Router)**, **React 19**, **Express + TypeScript REST API**, **Prisma ORM**, **PostgreSQL** y **Tailwind CSS v4**.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Descripción |
|---|---|---|
| **Monorepo** | [Turborepo](https://turbo.build/) | Orquestador de builds, pipelines y caché inteligente |
| **Package Manager** | [pnpm v10](https://pnpm.io/) | Gestor de paquetes rápido y estricto con soporte de workspaces |
| **Frontend UI** | [Next.js 15](https://nextjs.org/) + [React 19](https://react.dev/) | App Router, layouts por roles, Server Actions y componentes cliente |
| **Backend REST API** | [Express](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/) | API REST modular, autenticación JWT, RBAC, auditoría y mailer |
| **Estilos & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) | Diseño responsivo, modo claro/oscuro, modales interactivos |
| **ORM & Tipado** | [Prisma ORM](https://www.prisma.io/) | Modelado tipado en TypeScript con esquemas PostgreSQL |
| **Base de Datos** | [PostgreSQL 17](https://www.postgresql.org/) | Motor relacional multi-esquema (`edificio`, `public`) con soporte de poolers |
| **Servicios de Correo** | [Brevo (Sendinblue)](https://www.brevo.com/) / SMTP | Notificaciones y envío de comunicados masivos |
| **Infraestructura** | [Docker](https://www.docker.com/) | Contenedor local para PostgreSQL portable y reproducible |

---

## ✨ Módulos y Funcionalidades del Sistema

### 1. 👥 Gestión de Usuarios y Accesos
- **RBAC (Control de Acceso Basado en Roles):** Administrador, Copropietario, Directorio y Consulta.
- Gestión de cuentas de usuario vinculadas a personas/residentes.
- Bloqueo por intentos fallidos, auditoría de accesos y reseteo de estados.

### 2. 🏠 Residentes y Departamentos
- Registro completo de personas (propietarios e inquilinos) con validación de CI/NIT único.
- Gestión de departamentos, pisos, tipos de departamento (expensas base por m² o fijas).
- Asignación de unidades, parqueos y bauleras a residentes con historial de ocupación.

### 3. 💵 Gestión de Expensas y Pagos
- Emisión masiva e individual de expensas mensuales con cálculo proporcional o base.
- Configuración de conceptos extra (multas, reservas de áreas comunes, reparaciones).
- Reglas de mora configurables con cálculo automático.
- Registro y aplicación de anticipos de expensas.

### 4. 📱 Cobros y Pagos con QR (Simple / Transferencia)
- Generación y visualización de QR de cobro configurable con cuenta bancaria fija o seleccionable.
- Registro de comprobante de pago por imagen/archivo con visor ampliable.
- Generación automática del movimiento de ingreso en caja/bancos al confirmar el pago.
- Emisión de recibos de pago digitales con desglose completo.
- Soporte para anulación de pagos con reversión contable transparente.

### 5. 💧 Medición y Cobro de Agua
- Registro de lecturas mensuales de medidores por departamento.
- Configuración de tarifas por tramos de consumo ($m^3$).
- Integración automática del monto de agua dentro de la expensa mensual.

### 6. 💼 Finanzas, Caja y Bancos
- **Ingresos y Egresos:** Registro clasificado por categorías contables.
- **Caja Chica / Efectivo:** Apertura, arqueo, movimientos y cierre de caja.
- **Cuentas Bancarias:** Registro de múltiples cuentas bancarias institucionales.
- **Conciliación Bancaria:** Importación y cotejo de extractos bancarios vs. movimientos registrados.
- **Flujo de Caja:** Visualización en tiempo real de saldos, ingresos y egresos.

### 7. 👷 Gestión de Personal
- Padrón de empleados y colaboradores del edificio (conserjería, seguridad, limpieza).
- Registro de conceptos salariales (básicos, bonos, deducciones) y pagos de sueldos.

### 8. 📢 Comunicados y Notificaciones
- Redacción y publicación de avisos generales o segmentados (propietarios, inquilinos).
- Envío masivo mediante correo electrónico integrado con Brevo / SMTP.

### 9. 📊 Auditoría y Reportes
- Registro de auditoría detallado (INSERT, UPDATE, DELETE) con usuario, IP y diferencias de datos.
- Reportes financieros exportables para reuniones de directorio y asambleas.

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
* [Node.js 20+](https://nodejs.org/)
* [pnpm v10+](https://pnpm.io/) (`npm install -g pnpm`)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (opcional para BD local)

---

### 2. Base de Datos

#### Opción A: Base de Datos Local con Docker
```bash
docker compose up -d
```
> Para reiniciar la base de datos limpia: `docker compose down -v && docker compose up -d`

#### Opción B: Base de Datos en la Nube (Supabase / Render)
Puedes utilizar una URL de conexión de PostgreSQL remota configurándola en el archivo `.env`.

---

### 3. Instalar Dependencias
Instala los paquetes en todo el monorepo:
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

Asegúrate de revisar las credenciales de base de datos (`DATABASE_URL`, `DIRECT_URL`) y `JWT_SECRET` en cada `.env`.

---

### 5. Sincronizar Prisma y Cargar Datos Iniciales (Seed)
Genera el cliente tipado de Prisma y carga los datos de prueba:
```bash
# Generar cliente de Prisma
pnpm db:generate

# Sincronizar esquema con la base de datos
pnpm db:push

# Poblar roles, usuarios, unidades, tarifas, expensas y cuentas de prueba
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
* **Health Check API:** [`http://localhost:4000/api/v1/health`](http://localhost:4000/api/v1/health)

---

## 🔑 Credenciales de Acceso de Prueba

El seeder inicial genera usuarios listos para pruebas:

| Correo | Contraseña | Rol | Acceso y Permisos |
|---|---|---|---|
| `admin@edificioxyz.com` | `admin123` | **Administrador** | Control total (Usuarios, Unidades, Finanzas, Cobros, Personal, Auditoría) |
| `directorio@edificioxyz.com` | `directorio123` | **Directorio** | Reportes financieros, estado contable y visualización de auditoría |
| `copropietario@edificioxyz.com` | `copropietario123` | **Copropietario** | Portal de residente: expensas propias, pagos QR, reservas y avisos |
| `consulta@edificioxyz.com` | `consulta123` | **Consulta** | Solo lectura de avisos y estados generales |

*(La pantalla de login incluye accesos rápidos para autocompletar credenciales de prueba).*

---

## 📁 Estructura del Proyecto

```
edificio-xyz-system/
├── backend/                         # Backend REST API Express + TypeScript
│   ├── src/
│   │   ├── index.ts                 # Entry point del servidor Express
│   │   ├── config.ts                # Variables de entorno y configuración
│   │   ├── middlewares/             # Middlewares (JWT auth, RBAC, auditoría, errores)
│   │   ├── modules/                 # Módulos de dominio de negocio
│   │   │   ├── agua/                # Lecturas y tarifas de consumo de agua
│   │   │   ├── auditoria/           # Trazabilidad de operaciones del sistema
│   │   │   ├── auth/                # Login, sesiones y renovación de tokens
│   │   │   ├── expensas/            # Lógica y cálculo de expensas
│   │   │   ├── mailer/              # Servicio de envío de emails (Brevo/SMTP)
│   │   │   ├── personas/            # Gestión de personas y residentes (HU02)
│   │   │   └── usuarios/            # Administración de cuentas y roles de usuario
│   │   └── routes/                  # Enrutadores REST (/api/v1)
│   │       ├── agua.routes.ts
│   │       ├── auditoria.routes.ts
│   │       ├── caja.routes.ts
│   │       ├── cobro.routes.ts      # Pagos con QR, comprobantes y anulación
│   │       ├── comunicados.routes.ts
│   │       ├── conciliacion.routes.ts
│   │       ├── cuentas-bancarias.routes.ts
│   │       ├── departamentos.routes.ts
│   │       ├── expensas.routes.ts
│   │       ├── movimientos.routes.ts
│   │       ├── personal.routes.ts
│   │       ├── tipos-departamento.routes.ts
│   │       └── unidades.routes.ts
│   ├── tests/                       # Pruebas unitarias e integración con Jest/Supertest
│   └── package.json
│
├── frontend/                        # Frontend Next.js 15 + React 19 + Tailwind CSS v4
│   ├── app/
│   │   ├── (admin)/                 # Panel de Control Administrativo
│   │   │   ├── conciliacion-bancaria/
│   │   │   ├── departamentos/
│   │   │   ├── egresos/
│   │   │   ├── expensas/            # Emisión, listado y cobro QR de expensas
│   │   │   ├── flujo-caja/
│   │   │   ├── ingresos/
│   │   │   ├── personal/
│   │   │   ├── residentes/          # Fichas de residentes y asignación de unidades
│   │   │   └── usuarios/            # Gestión y habilitación de usuarios
│   │   ├── (copropietario)/         # Portal del Copropietario
│   │   │   ├── comunicados/
│   │   │   ├── mi-cuenta/           # Estado de cuenta personal y expensas
│   │   │   └── reservas/            # Reservas de áreas comunes
│   │   ├── (directorio)/            # Portal del Directorio
│   │   │   ├── auditoria/           # Registro de auditoría en tiempo real
│   │   │   └── reportes/            # Balance y reportes ejecutivos
│   │   ├── (auth)/login/            # Pantalla de inicio de sesión
│   │   └── api/v1/[...path]/        # Proxy dinámico entre Next.js y el backend Express
│   ├── components/                  # Modales y componentes interactivos
│   │   ├── CobroQrSimuladorModal.tsx # Modal unificado de cobro QR y adjunto de comprobantes
│   │   ├── departamentos/           # Componentes de gestión de unidades y pisos
│   │   ├── expensas/                # Tablas y tarjetas de estados de expensas
│   │   ├── residentes/              # Modales de persona, ficha y asignación de unidades
│   │   └── usuarios/                # Tablas y modales de creación de usuarios
│   ├── lib/                         # Cliente fetch (`apiFetch`), manejo de cookies y JWT
│   └── package.json
│
├── packages/
│   ├── database/                    # Paquete compartido de Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Esquema relacional PostgreSQL (30+ modelos)
│   │   │   └── seed.ts              # Script de población de datos iniciales
│   │   └── src/index.ts             # Cliente Prisma exportable
│   └── typescript-config/           # Configuraciones base de TypeScript
│
├── .npmrc                           # Configuración de build-scripts para pnpm v10
├── vercel.json                      # Despliegue en Vercel
├── docker-compose.yml               # Configuración local de base de datos PostgreSQL
├── pnpm-workspace.yaml              # Configuración de workspaces monorepo
├── turbo.json                       # Configuración de pipelines Turborepo
└── package.json                     # Scripts del monorepo raíz
```

---

## 🛠️ Comandos Globales Útiles

```bash
# Desarrollo
pnpm dev              # Inicia Next.js (3000) y API Express (4000) en paralelo
pnpm web:dev          # Inicia únicamente el Frontend Next.js
pnpm api:dev          # Inicia únicamente el Backend API Express

# Calidad y Build
pnpm build            # Compila la base de datos, backend y frontend con Turborepo
pnpm lint             # Verificación estricta de tipos con TypeScript (tsc)
pnpm test             # Ejecuta las suites de pruebas automatizadas

# Base de Datos (Prisma)
pnpm db:generate      # Genera el cliente Prisma tipado
pnpm db:push          # Aplica los cambios de schema.prisma a la base de datos
pnpm db:seed          # Ejecuta el seeder con datos demo completos
pnpm db:studio        # Interfaz visual de Prisma Studio en http://localhost:5555
```

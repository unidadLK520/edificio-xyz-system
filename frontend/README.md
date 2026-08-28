# Frontend - Sistema de Administración Edificio XYZ

Stack: Vite + React + TypeScript + Tailwind CSS v4 + React Router + Axios.

## Setup

```
cp .env.example .env
pnpm install
pnpm dev
```

App disponible en `http://localhost:5173`. Requiere el backend corriendo en `http://localhost:4000` (ver README raíz del proyecto).

## Estructura

```
src/
  api/            # cliente axios + funciones que llaman al backend
  context/        # AuthContext (estado global de sesión)
  components/     # componentes compartidos (ProtectedRoute, etc.)
  pages/          # una carpeta por pantalla (Login, Dashboard, ...)
```

## Autenticación

`AuthContext` maneja el login contra `POST /auth/login`, guarda el JWT en `localStorage` y lo agrega automáticamente a cada request vía interceptor de axios. `ProtectedRoute` redirige a `/login` si no hay sesión activa.

## Usuarios de prueba

Ver `database/seeds/001_seed_data.sql` en la raíz del proyecto.

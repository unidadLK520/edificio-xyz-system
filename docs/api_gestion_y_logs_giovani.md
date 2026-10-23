API de Gestión y Logs: Edificio XYZ (Giovani, Backend Financiero)
Roles visibles del sistema: Administrador, Directorio, Consulta.
Base de rutas: `/api/v1`. Autenticación: `Authorization: Bearer <token>`.
---
## 0. Contratos en cambio (leer antes de integrar)
Esta sección avisa a Frontend y QA qué está vigente y qué cambiará según el requerimiento del ingeniero (expensa fija por tipo A/B/C).
Ya vigente (implementado y probado):
- `generar-masivo`: el monto_base sale del tipo del departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400), `monto_agua` sale del monto registrado para ese departamento y período (`montos_agua`), `monto = monto_base + monto_agua`, `saldo = monto`. Sin monto registrado: se emite solo con el monto base y se reporta en `advertencias[]` (sin mencionar lecturas). Omite duplicados y aplica FIFO de anticipos disponibles. `montoBase` y `excluirDepartamentos` se aceptan solo por compatibilidad hacia atrás. Cada expensa conserva su monto al emitirse de forma inmutable.
- `PUT /api/v1/agua/montos` (Administrador, Directorio): `{ periodo, montos: [{ idDepartamento, montoAgua }] }`. Normaliza el período siempre al primer día del mes (YYYY-MM-01). Crea o actualiza por `(departamento, periodo)` en una transacción (todo o nada). Responde `400` si el monto es negativo o inválido; `422` si el departamento no existe; `409` si ya hay expensa emitida para ese departamento y período. Auditoría `REGISTRO_MONTO_AGUA` por departamento con `datosAnteriores` y `datosNuevos`.
- `GET /api/v1/agua/montos` (Administrador, Directorio, Consulta): listado de montos registrados con filtros opcionales por `periodo` (normalizado) e `idDepartamento`.
- Respuestas de expensas (`GET /expensas`, `GET /expensas/:id`, `POST /expensas`, `POST /expensas/generar-masivo`) y estado de cuenta (`GET /expensas/estado-cuenta/:idDepartamento`): devuelven `montoBase`, `montoAgua`, `monto` (total) y `concepto` ("Expensa mensual Tipo B" y "Agua" si monto_agua > 0, sin m3).
- `GET/PUT /expensas/montos-tipo` (Administrador, Directorio): lee y actualiza `tipos_departamento.monto_expensa`. Valida monto > 0. Auditoría `CONFIGURAR_MONTO_EXPENSA` con `datosAnteriores` y `datosNuevos`. Modificar el monto no altera expensas ya emitidas.
- `POST /expensas/:id/pagos` (directo y anticipo) y `PATCH /expensas/pagos/:idPago/corregir`: `idPersonaPagador` es estrictamente obligatorio (número entero positivo y validación de existencia en la tabla `personas`; responde `422` si falta o no existe).
- `POST /expensas/:id/pagos` y `PATCH /expensas/pagos/:idPago/corregir`: devuelven `422` si `montoPagado <= 0`, si la expensa ya está Pagada o si el monto excede el saldo.
- `POST /expensas`: devuelve `409` si ya existe expensa del mismo departamento y período.
- `GET /expensas` y `GET /expensas/:id`: incluyen el campo `vencida`; el listado acepta `?vencida=true`.
- `calcular-mora`: sin días de espera ni días de gracia como campo activo (vencida si hoy > fechaVencimiento). La mora se calcula sobre el capital pendiente (monto − pagos directos − anticipos aplicados) sobre el total (fijo + agua). Un solo % por expensa vencida, sin crecer con el tiempo. La tasa de la expensa manda; si es 0, toma la regla activa.
- `GET/POST /expensas/reglas-mora`: mora configurable (tasa de interés). Ya no existe el fallback fijo al 5 %. El concepto de "días de gracia" ya no es un campo activo de configuración de mora (la regla opera con aplicación inmediata al vencimiento; `POST` acepta `diasGracia` solo por compatibilidad hacia atrás pero se ignora y almacena/devuelve siempre 0).
- `generar-masivo` y `POST /expensas`: copian la tasa de la regla activa a `expensas.tasa_interes_mora` (la de la expensa manda; si cambia la regla activa, las expensas emitidas conservan su tasa).
- `GET/POST/PUT /api/v1/tipos-departamento` (Administrador, Directorio): nombre libre hasta 60 caracteres y único (ej. "Suite Presidencial Premium"), `montoExpensa > 0`, `areaM2` opcional, `activo`. `PUT` con `activo=false` devuelve `409` si hay departamentos asignados. Auditorías `CREAR_TIPO_DEPARTAMENTO` y `ACTUALIZAR_TIPO_DEPARTAMENTO`. `GET/PUT /expensas/montos-tipo` se mantienen como alias compatibles.
- Asignación de tipos a departamentos: `PUT /api/v1/departamentos/:id/tipo` y `PUT /api/v1/departamentos/asignar-tipo` (Administrador, Directorio). Asignación en transacción atómica (todo o nada). Solo tipos activos (`422` si inactivo o inexistente). Hereda `area_m2` del tipo si el departamento no tiene. Auditoría `ASIGNAR_TIPO_DEPARTAMENTO`.
- Cron de mora (apagado por defecto, timezone America/La_Paz).
- Historial de unidades: derivado de `ocupantes_departamento` (departamentos) y de `auditoria` (parqueos y bauleras), sin modelo físico `historial_asignacion_unidades`. Asignaciones y liberaciones atómicas en `$transaction`.
- `POST /unidades` y `PUT /unidades/Departamento/:id` aceptan `idTipo` opcional con validación de existencia en `tipos_departamento` (422 si no existe). `GET /unidades` devuelve `tipo` y `monto`.
- `POST` y `PUT /api/v1/movimientos` (US2.3): aceptan opcionalmente `tercero` (hasta 120 caracteres), `nroFactura` (hasta 50 caracteres) y `metodoPago` (hasta 30 caracteres, texto libre no restringido a lista cerrada) y los devuelven en listado y detalle; sin ellos los campos se guardan y retornan como `null` (se aplica trim automático y cadenas vacías se convierten a `null`). Si faltan campos obligatorios (`tipo`, `idCategoria`/`categoria`, `monto`, `fecha`, `descripcion`), responde `400 Validation Error` con `details` por campo.
- `GET /api/v1/movimientos`: el filtro `q` busca coincidencias parciales (case-insensitive) tanto en `descripcion` como en `tercero` y `nro_factura`.
- `POST /api/v1/movimientos/categorias` y `PUT /api/v1/movimientos/categorias/:id` (US2.3): gestión de categorías para Administrador con nombre único por tipo (`Ingreso` o `Egreso`), longitud máxima de 80 caracteres y eventos de auditoría (`CREAR_CATEGORIA`, `MODIFICAR_CATEGORIA`). `GET /movimientos/categorias` sigue disponible para Administrador y Directorio.
Por implementar (cambiará, no construir sobre lo anterior):
- `GET /expensas/estado-cuenta/:idDepartamento`: filtros `periodo`, `desde`, `hasta`, `movimientos`, `sinMovimientos`, pagador y ocupante actual.
- Emisión y lectura de expensas y estado de cuenta para rol Consulta: queda como "Pendiente" según el código actual y la matriz RBAC.
Fuera del sistema (según el requerimiento formal): cálculo de expensas por alícuota sobre gastos comunes (reemplazado por expensa fija por tipo de departamento A/B/C más agua potable), rol "Copropietario" (los roles del sistema son exclusivamente Administrador, Directorio y Consulta), servicios de luz y gas, monto y contratos de alquiler. El registro de inquilinos y el historial de ocupantes sí permanece.
---
## 1. Módulo de Autenticación, Control de Acceso y Sesiones
Ubicación en el código: `backend/src/modules/auth/`
Prefijo de ruta: `/api/v1/auth`

### 1.1 Iniciar Sesión (Login)
Método y Ruta: `POST /api/v1/auth/login`
Propósito: Autentica con correo y contraseña (bcrypt). Protección contra fuerza bruta: máximo 3 intentos; al 3.º se bloquea la cuenta 10 minutos. Genera el JWT con rol, expiración y claim `sid` de sesión. Audita `LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `USUARIO_BLOQUEADO` o `SESION_RECHAZADA`.
Política de Sesión Única:
- Si el usuario ya cuenta con una sesión activa (`edificio.sesiones.activa = true` y `ultimo_acceso < 30 min`), la petición es rechazada con código `409 Conflict` y mensaje `"Esta cuenta ya tiene una sesión activa"`, auditando el evento `SESION_RECHAZADA`.
- Si la sesión activa previa venció por inactividad (`ultimo_acceso >= 30 min`), se cierra automáticamente (`activa = false`) y se crea la nueva sesión.
- El `INSERT` en la tabla `edificio.sesiones` respeta el índice único parcial `idx_sesiones_usuario_activa` (`WHERE activa = true`). Frente a intentos de login simultáneos o condiciones de carrera, el error de unicidad (`P2002`) es interceptado y retorna `409 Conflict` con auditoría `SESION_RECHAZADA`.
- El JWT generado incluye el claim `sid` con el identificador único UUID de la sesión creada (`id_sesion`).

Rol requerido: Público.
Request:
```json
{ "correo": "admin@edificioxyz.com", "password": "********" }
```
Respuesta 200 OK:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "idUsuario": 1,
    "nombreUsuario": "admin",
    "correo": "admin@edificioxyz.com",
    "rol": "Administrador",
    "ultimoAcceso": "2026-09-27T21:32:43.630Z"
  }
}
```
Errores:
- `400`: `{ "error": "Validation Error", "message": "Datos inválidos o faltantes" }`
- `401`: `{ "error": "Unauthorized", "message": "Credenciales inválidas" }`
- `409`: `{ "error": "Conflict", "message": "Esta cuenta ya tiene una sesión activa" }` (sesión activa concurrente o concurrencia P2002).

### 1.2 Cerrar Sesión (Logout)
Método y Ruta: `POST /api/v1/auth/logout`
Propósito: Marca la sesión en la base de datos como inactiva (`activa = false`), agrega el token a la lista negra en memoria y audita `LOGOUT` con IP y metadatos. Permite que el usuario pueda volver a iniciar sesión sin conflicto.
Rol requerido: Autenticado.
Respuesta 200: `{ "message": "Sesión cerrada exitosamente" }`

### 1.3 Consultar Sesión Actual (Me) & Middleware de Sesión
Método y Ruta: `GET /api/v1/auth/me`
Propósito: Verifica el JWT, que el usuario siga activo y el estado de la sesión en base de datos.
Control de Middleware:
- Si el JWT incluye el claim `sid`: valida contra `edificio.sesiones` que la sesión exista y permanezca activa (`activa = true`). Si la sesión fue forzada o cerrada, retorna `401 Unauthorized`.
- Expiración por inactividad: valida que `Date.now() - ultimo_acceso <= 30 min`. Si venció, marca la sesión inactiva y retorna `401 Unauthorized` (`"Sesión expirada por inactividad. Vuelva a iniciar sesión."`).
- Actualización de actividad (`ultimo_acceso`): se actualiza en base de datos como máximo **una vez por minuto** por sesión (con un mecanismo de throttling en memoria), protegiendo la base de datos de saturación por consultas repetidas.
- Retrocompatibilidad: los tokens emitidos antes del despliegue (sin claim `sid`) se mantienen válidos en el middleware hasta su expiración natural.

Rol requerido: Autenticado (Administrador, Directorio, Consulta).
Respuesta 200:
```json
{
  "idUsuario": 1,
  "nombreUsuario": "admin",
  "correo": "admin@edificioxyz.com",
  "activo": true,
  "fechaCreacion": "2026-09-07T02:47:37.990Z",
  "ultimoAcceso": "2026-09-27T21:32:43.630Z",
  "rol": { "idRol": 1, "nombre": "Administrador", "descripcion": "Control total del sistema" }
}
```

### 1.4 Forzar Cierre de Sesión (Sesión Forzada)
Método y Ruta: `DELETE /api/v1/auth/sesiones/:idUsuario`
Propósito: Permite al Administrador cerrar inmediatamente y de forma forzada la sesión activa de cualquier cuenta en el sistema (ej. por bloqueo, cambio de permisos o actividad sospechosa).
Rol requerido: **Administrador** exclusivamente (retorna `403 Forbidden` si cualquier otro rol intenta ejecutarlo).
Parámetros:
- `:idUsuario` (en la URL): ID del usuario cuya sesión se desea revocar.
Comportamiento:
- Marca todas las sesiones activas de dicho usuario como inactivas (`activa = false`).
- Registra el evento de auditoría `SESION_FORZADA` indicando el operador que forzó el cierre, el usuario afectado y la cantidad de sesiones finalizadas.
- La víctima recibirá `401 Unauthorized` en su siguiente petición al detectar que su sesión ya no está activa en la base de datos.
Respuesta 200:
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente",
  "data": {
    "idUsuario": 5,
    "sesionesCerradas": 1
  }
}
```
Errores:
- `400`: `{ "error": "Bad Request", "message": "ID de usuario inválido" }`
- `401`: `{ "error": "Unauthorized", "message": "Token de autenticación requerido..." }`
- `403`: `{ "error": "Forbidden", "message": "No tiene permisos para realizar esta acción" }`
---
## 2. Módulo de Administración de Personas (US1.4)
Padrón de propietarios, inquilinos y ocupantes, asignación de unidades e historial de ocupación.
Ubicación: `backend/src/modules/personas/` · Prefijo: `/api/v1/personas`
2.1 Listado y búsqueda paginada
`GET /api/v1/personas` · Roles: Administrador, Directorio, Consulta.
Query: `q` (nombre, apellido, CI/NIT, correo), `page` (1), `limit` (20).
Incluye departamentos propios y ocupaciones vigentes.
Respuesta 200:
```json
{
  "data": [
    {
      "idPersona": 1,
      "ciNit": "4829103 CBBA",
      "nombres": "Carlos",
      "apellidos": "Mendoza Rojas",
      "telefono": "+591 71234567",
      "correo": "carlos.mendoza@email.com",
      "direccion": "Av. Ballivián 1234, Edificio XYZ",
      "departamentosPropios": [{ "idDepartamento": 1, "numero": "101", "piso": 1, "estado": "Ocupado" }],
      "ocupaciones": [
        {
          "idOcupacion": 1,
          "tipoOcupante": "Propietario",
          "fechaInicio": "2023-01-15T00:00:00.000Z",
          "fechaFin": null,
          "departamento": { "idDepartamento": 1, "numero": "101" }
        }
      ]
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```
2.2 Detalle de persona
`GET /api/v1/personas/:id` · Roles: Administrador, Directorio, Consulta.
```json
{
  "data": {
    "idPersona": 1, "ciNit": "4829103 CBBA", "nombres": "Carlos", "apellidos": "Mendoza Rojas",
    "telefono": "+591 71234567", "correo": "carlos.mendoza@email.com",
    "direccion": "Av. Ballivián 1234", "fechaRegistro": "2026-09-08T12:00:00.000Z"
  }
}
```
2.3 Historial de ocupaciones de una persona
`GET /api/v1/personas/:id/historial` · Roles: Administrador, Directorio, Consulta.
```json
{
  "data": [
    {
      "idOcupacion": 1, "tipoOcupante": "Inquilino",
      "fechaInicio": "2022-01-01T00:00:00.000Z", "fechaFin": "2022-12-31T23:59:59.000Z",
      "departamento": { "idDepartamento": 2, "numero": "102", "piso": 1 }
    }
  ]
}
```
2.4 Historial de residentes de un departamento
`GET /api/v1/personas/departamentos/:idDepartamento/historial` · Roles: Administrador, Directorio, Consulta.
```json
{
  "data": [
    {
      "idOcupacion": 5, "idPersona": 3, "tipoOcupante": "Inquilino",
      "fechaInicio": "2024-03-01T00:00:00.000Z", "fechaFin": null,
      "persona": { "nombres": "Roberto", "apellidos": "Gómez", "ciNit": "7182930 LPZ", "telefono": "+591 70123456" }
    }
  ]
}
```
2.5 Registrar persona
`POST /api/v1/personas` · Roles: Administrador, Directorio. Valida unicidad de CI/NIT y audita.
```json
{
  "ciNit": "5920144 SCZ", "nombres": "Mariana", "apellidos": "Flores Soliz",
  "telefono": "+591 79876543", "correo": "mariana.flores@email.com", "direccion": "Calle Sucre 456"
}
```
Respuesta 201: `{ "message": "Persona registrada exitosamente", "data": { "idPersona": 2, ... } }`
2.6 Actualizar persona
`PUT /api/v1/personas/:id` · Roles: Administrador, Directorio. Audita el delta (anterior/nuevo).
```json
{ "telefono": "+591 77112233", "correo": "m.flores.nuevo@email.com", "direccion": "Av. América 890" }
```
Respuesta 200: `{ "message": "Persona actualizada exitosamente", "data": { ... } }`
2.7 Asignar persona a unidad (ocupación / titularidad)
`POST /api/v1/personas/:id/unidades` · Roles: Administrador, Directorio.
Asigna un departamento como `Propietario` (actualiza titularidad) o `Inquilino` (estado de la unidad a `Ocupado`). Transacción atómica con auditoría.
```json
{ "idDepartamento": 1, "tipoOcupante": "Inquilino", "fechaInicio": "2026-10-01" }
```
Respuesta 201:
```json
{
  "message": "Asignación de unidad realizada exitosamente",
  "data": { "idOcupacion": 8, "idPersona": 2, "idDepartamento": 1, "tipoOcupante": "Inquilino", "fechaInicio": "2026-10-01T00:00:00.000Z", "fechaFin": null }
}
```
2.8 Finalizar ocupación
`PATCH /api/v1/personas/ocupaciones/:idOcupacion/finalizar` · Roles: Administrador, Directorio.
Marca `fechaFin` y reevalúa el estado del departamento (`Disponible` si no quedan ocupantes activos).
```json
{ "fechaFin": "2026-09-30" }
```
Respuesta 200: `{ "message": "Ocupación finalizada exitosamente", "data": { "idOcupacion": 8, "fechaFin": "2026-09-30T00:00:00.000Z" } }`
---
## 3. Módulo de Unidades: Departamentos, Parqueos y Bauleras
Ubicación: `backend/src/routes/unidades.routes.ts` · Prefijo: `/api/v1/unidades`
3.1 Listado unificado (inventario)
`GET /api/v1/unidades` · Roles: Administrador, Directorio, Consulta.
Query: `tipo` (Todos, Departamento, Parqueo, Baulera), `estado` (Disponible, Ocupado, Mantenimiento, EnAlquiler), `search`.
Devuelve lista homogénea; para departamentos incluye `idTipo`, `tipo` y `monto` del tipo configurado en `tipos_departamento`.
```json
{
  "data": [
    {
      "id": 1,
      "tipoUnidad": "Departamento",
      "numero": "101",
      "piso": 1,
      "areaM2": 110.5,
      "estado": "Ocupado",
      "idTipo": 1,
      "tipo": "A",
      "monto": 300.0,
      "propietario": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Mendoza Rojas", "ciNit": "4829103 CBBA" },
      "ocupanteActual": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" },
      "parqueos": [{ "idParqueo": 1, "numero": "P-01" }],
      "bauleras": [{ "idBaulera": 1, "numero": "B-01" }]
    },
    { "id": 1, "tipoUnidad": "Parqueo", "numero": "P-01", "estado": "Asignado", "idDepartamento": 1, "departamento": { "idDepartamento": 1, "numero": "101" } }
  ],
  "meta": { "total": 2, "page": 1, "limit": 50, "totalPages": 1 }
}
```
3.2 Detalle de unidad con historial
`GET /api/v1/unidades/:tipo/:id` · Roles: Administrador, Directorio, Consulta.
Propósito: Retorna la información completa de una unidad específica (`tipo`: `Departamento`, `Parqueo` o `Baulera`). Para Departamentos incluye `tipo`, `monto` del tipo configurado (`tipos_departamento`) y su `historialAsignaciones` derivado dinámicamente de `ocupantes_departamento`. Para Parqueos y Bauleras, su `historialAsignaciones` se deriva de los eventos registrados en el subsistema de `auditoria` de dicha unidad. Mantiene la misma estructura de respuesta homogénea (`idHistorial`, `tipoUnidad`, `idUnidad`, `idPersona`, `tipoRelacion`, `fechaInicio`, `fechaFin`, `notas`, `persona`, `departamento`).
```json
{
  "unidad": {
    "id": 1,
    "tipoUnidad": "Departamento",
    "numero": "101",
    "piso": 1,
    "areaM2": 110.5,
    "estado": "Ocupado",
    "idTipo": 1,
    "tipo": "A",
    "monto": 300.0,
    "propietario": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Mendoza Rojas" },
    "parqueos": [{ "idParqueo": 1, "numero": "P-01" }],
    "bauleras": [{ "idBaulera": 1, "numero": "B-01" }]
  },
  "historialAsignaciones": [
    {
      "idHistorial": 1,
      "tipoUnidad": "Departamento",
      "idUnidad": 1,
      "numeroUnidad": "101",
      "idPersona": 1,
      "idDepartamento": 1,
      "tipoRelacion": "Propietario",
      "fechaInicio": "2023-01-15T00:00:00.000Z",
      "fechaFin": null,
      "notas": "Ocupación registrada como Propietario",
      "persona": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Mendoza Rojas" },
      "departamento": { "idDepartamento": 1, "numero": "101" }
    }
  ]
}
```
3.3 Crear unidad
`POST /api/v1/unidades` · Roles: Administrador, Directorio.
Valida no duplicidad del identificador por tipo. Para Departamentos, acepta opcionalmente `idTipo` (validando su existencia en `tipos_departamento`, respondiendo `422 Unprocessable Entity` si no existe). Registra el evento en auditoría (`CREATE`).
Request:
```json
{ "tipoUnidad": "Departamento", "numero": "401", "piso": 4, "areaM2": 95.5, "idTipo": 1, "estado": "Disponible" }
```
Respuesta 201:
```json
{
  "message": "Departamento creado exitosamente",
  "unidad": {
    "id": 15,
    "tipoUnidad": "Departamento",
    "numero": "401",
    "piso": 4,
    "areaM2": 95.5,
    "estado": "Disponible",
    "idTipo": 1,
    "tipo": "A",
    "monto": 300.0
  }
}
```
Error 400: `{ "error": "Validation Error", "message": "Datos requeridos inválidos", "details": { "tipoUnidad": ["Required"], "numero": ["Required"] } }`
Error 422: `{ "error": "UNPROCESSABLE_ENTITY", "message": "El idTipo especificado no existe en tipos_departamento" }`
3.4 Editar unidad
`PUT /api/v1/unidades/:tipo/:id` · Roles: Administrador, Directorio.
Modifica los atributos físicos o de tipo de una unidad. Para Departamentos, acepta `idTipo` opcional (con validación de existencia en `tipos_departamento`, respondiendo `422 Unprocessable Entity` si no existe). Audita `UPDATE` con `datosAnteriores` y `datosNuevos`.
Request:
```json
{ "numero": "401-A", "areaM2": 98.0, "estado": "EnAlquiler", "idTipo": 2 }
```
Respuesta 200:
```json
{
  "message": "Unidad actualizada exitosamente",
  "unidad": {
    "id": 15,
    "tipoUnidad": "Departamento",
    "numero": "401-A",
    "piso": 4,
    "areaM2": 98.0,
    "estado": "EnAlquiler",
    "idTipo": 2,
    "tipo": "B",
    "monto": 350.0
  }
}
```
Error 422: `{ "error": "UNPROCESSABLE_ENTITY", "message": "El idTipo especificado no existe en tipos_departamento" }`
3.5 Asignación atómica de unidad
`POST /api/v1/unidades/asignaciones` · Roles: Administrador, Directorio.
Vincula de manera atómica transaccional una unidad a una persona o departamento titular mediante `$transaction` sin utilizar `historial_asignacion_unidades`. En Parqueos y Bauleras actualiza exclusivamente `estado` (a `Asignado`), `id_departamento`, `id_persona` y `fecha_asignacion`. Audita `ASIGNACION_UNIDAD`.
Request:
```json
{ "tipoUnidad": "Parqueo", "idUnidad": 1, "idDepartamento": 1, "idPersona": 1, "tipoRelacion": "Asignado", "notas": "Asignación de parqueo principal" }
```
Respuesta 201:
```json
{
  "message": "Asignación de parqueo registrada y estado actualizado a Asignado",
  "parqueo": {
    "idParqueo": 1,
    "numero": "P-01",
    "estado": "Asignado",
    "idDepartamento": 1,
    "idPersona": 1,
    "fechaAsignacion": "2026-10-11T19:00:00.000Z"
  }
}
```
3.6 Finalizar asignación
`POST /api/v1/unidades/asignaciones/finalizar` · Roles: Administrador, Directorio.
Concluye la asignación activa de una unidad liberándola de forma atómica en `$transaction` sin usar `historial_asignacion_unidades`. En Parqueos y Bauleras actualiza `estado` a `Disponible` y limpia `id_departamento`, `id_persona` y `fecha_asignacion`. Para Departamentos finaliza los ocupantes activos en `ocupantes_departamento` y re-evalúa el estado. Audita `FINALIZACION_ASIGNACION`.
Request:
```json
{ "tipoUnidad": "Parqueo", "idUnidad": 1, "notas": "Liberación de parqueo" }
```
Respuesta 200:
```json
{
  "message": "Asignación de parqueo finalizada",
  "parqueo": {
    "idParqueo": 1,
    "numero": "P-01",
    "estado": "Disponible",
    "idDepartamento": null,
    "idPersona": null,
    "fechaAsignacion": null
  }
}
```
---
---
## 4. Módulo de Expensas, Pagos, Mora y Agua (US2.1 / US2.2, HU04)
Ciclo de vida de las obligaciones de expensas: montos manuales de agua, generación mensual fija más monto de agua registrado, pagos, anticipos con aplicación FIFO, mora configurable sobre el total, estado de cuenta y corrección o anulación con recálculo y auditoría.
Ubicación: `backend/src/modules/expensas/`, `backend/src/modules/agua/` · Prefijos: `/api/v1/expensas` y `/api/v1/agua`

### 4.0 Gestión de Agua: Montos Manuales (Prompt 8)
El cálculo del agua se efectúa fuera del sistema. El sistema proporciona un campo para que el administrador registre un monto manual cada mes para cada departamento. No existen tarifas, lecturas ni consumo en m3.

#### 4.0.1 Registro y actualización de montos de agua
- `PUT /api/v1/agua/montos` · Roles: Administrador, Directorio.
  Registra o actualiza en lote los montos manuales de agua por `(departamento, periodo)` en una transacción atómica (todo o nada).
  - Normaliza siempre el período al primer día del mes (`YYYY-MM-01`).
  - Responde `400 Bad Request` si el monto es negativo (`< 0`) o inválido.
  - Responde `422 Unprocessable Entity` si el departamento no existe.
  - Responde `409 Conflict` si ya existe una expensa emitida para ese departamento y período.
  - Audita el evento `REGISTRO_MONTO_AGUA` por cada departamento con `datosAnteriores` y `datosNuevos`.
  Request:
  ```json
  {
    "periodo": "2026-10-01",
    "montos": [
      { "idDepartamento": 1, "montoAgua": 85.5 },
      { "idDepartamento": 2, "montoAgua": 110.0 }
    ]
  }
  ```
  Respuesta 200:
  ```json
  {
    "message": "Montos de agua registrados exitosamente",
    "periodo": "2026-10-01",
    "total": 2,
    "montos": [
      { "idMonto": 1, "idDepartamento": 1, "periodo": "2026-10-01", "montoAgua": 85.5, ... },
      { "idMonto": 2, "idDepartamento": 2, "periodo": "2026-10-01", "montoAgua": 110.0, ... }
    ]
  }
  ```

#### 4.0.2 Consulta de montos de agua
- `GET /api/v1/agua/montos` · Roles: Administrador, Directorio, Consulta (A, D, C).
  Listado de montos registrados con filtros opcionales por `periodo` e `idDepartamento`.
  Respuesta 200:
  ```json
  {
    "data": [
      { "idMonto": 1, "idDepartamento": 1, "periodo": "2026-10-01", "montoAgua": 85.5, "departamento": { "numero": "101", ... } }
    ],
    "total": 1
  }
  ```

### 4.1 Generación masiva de expensas (CA01-CA04)
`POST /api/v1/expensas/generar-masivo` · Roles: Administrador, Directorio.
Genera en una transacción las expensas del período:
- `monto_base`: del tipo de departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400).
- `monto_agua`: del monto manual registrado para ese departamento y período en `montos_agua`. Si no hay monto registrado, emite únicamente con monto base y reporta advertencia en `advertencias[]` (sin mencionar lecturas).
- `monto = monto_base + monto_agua`, `saldo = monto`.
- Aplica de inmediato los anticipos disponibles en orden FIFO dentro de la misma transacción.
- Una expensa emitida nunca se modifica tras su emisión. Audita `GENERACION_MASIVA_EXPENSAS`.
- **Manejo de `tasaInteresMora` en el body:** El body acepta opcionalmente `tasaInteresMora?: number`. Si se envía en el request, se aplica explícitamente dicho porcentaje a las expensas generadas; si se omite (`undefined`), el sistema copia automáticamente la tasa de la regla activa vigente (`reglaMora` donde `activa = true`, o 0 si no existe regla activa). En ambos casos, el valor queda guardado en `expensas.tasa_interes_mora` de cada expensa emitida y manda de forma inmutable frente a futuros recálculos de mora ("la tasa de la expensa manda").
- **Filtro interno de prueba `idDepartamentos`:** El body acepta opcionalmente `idDepartamentos?: number[]` como filtro interno (utilizado para pruebas automatizadas y emisión selectiva puntual). Si se omite o está vacío, opera de forma masiva sobre todos los departamentos elegibles (respetando los excluidos en `excluirDepartamentos?: number[]`).
Request:
```json
{ "periodo": "2026-10-01", "fechaVencimiento": "2026-10-15", "tasaInteresMora": 5 }
```
Respuesta 201:
```json
{
  "message": "Se generaron 12 expensas para el período 2026-10-01",
  "generadasCount": 12,
  "excepcionesCount": 2,
  "advertenciasCount": 1,
  "excepciones": [
    { "idDepartamento": 1, "numero": "101", "motivo": "Expensa ya fue generada previamente para este período" }
  ],
  "advertencias": [
    { "idDepartamento": 8, "numero": "302", "advertencia": "Sin monto de agua registrado para el período; se emitió únicamente con monto base" }
  ]
}
```
4.2 Cálculo de mora (CA10, CA12)
`POST /api/v1/expensas/calcular-mora` · Roles: Administrador, Directorio.
Evalúa expensas vencidas (hoy > `fechaVencimiento`, sin días de espera) con saldo pendiente. Calcula la mora sobre el capital pendiente (monto total − pagos − anticipos), por lo que la mora se aplica sobre el total (fijo + agua). Actualiza `montoMora`, `saldoPendiente` y el estado `Moroso`. Audita `CALCULO_MORA_EXPENSAS`.
- **Filtro interno de prueba `idDepartamentos`:** Acepta opcionalmente en el body `{ "idDepartamentos": [ ... ] }` como filtro interno (utilizado primordialmente para pruebas automatizadas y diagnósticos controlados). Si se omite o está vacío, tanto este endpoint manual como la tarea programada (`cron`) operan siempre de manera global sobre todas las expensas vencidas elegibles del sistema.
Request: vacío `{}` o `{ "idDepartamentos": [1, 2] }`.
```json
{ "message": "Se aplicó el recargo de mora a 3 expensas vencidas", "actualizadasCount": 3 }
```
4.3 Listado paginado (CA11)
`GET /api/v1/expensas` · Roles: Administrador, Directorio.
Query: `estado`, `idDepartamento`, `periodo`, `vencida`, `page`, `limit`.
Cada expensa incluye `montoBase`, `montoAgua`, `monto` (total), `concepto` ("Expensa mensual Tipo B y Agua" si `montoAgua > 0`, sin m3) y `vencida`.
```json
{
  "data": [
    {
      "idExpensa": 1, "idDepartamento": 1, "periodo": "2026-10-01T00:00:00.000Z",
      "montoBase": 350.0, "montoAgua": 85.5, "monto": 435.5, "montoMora": 0, "saldoPendiente": 435.5,
      "concepto": "Expensa mensual Tipo B y Agua",
      "tasaInteresMora": 5, "fechaVencimiento": "2026-10-15T00:00:00.000Z", "estado": "Pendiente", "vencida": false,
      "departamento": { "numero": "101", "piso": 1, "tipo": { "nombre": "B" }, "propietario": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Mendoza Rojas" } },
      "pagos": [],
      "_count": { "pagos": 0 }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```
4.4 Detalle de expensa
`GET /api/v1/expensas/:id` · Roles: Administrador, Directorio.
Incluye departamento con tipo, titular, pagos directos, `aplicacionesAnticipos`, `montoBase`, `montoAgua`, `monto`, `concepto` ("Expensa mensual Tipo B y Agua" si `montoAgua > 0`, sin m3) y `vencida`.
```json
{
  "idExpensa": 1, "idDepartamento": 1, "periodo": "2026-10-01T00:00:00.000Z",
  "montoBase": 350.0, "montoAgua": 85.5, "monto": 435.5, "montoMora": 0, "saldoPendiente": 435.5,
  "concepto": "Expensa mensual Tipo B y Agua",
  "tasaInteresMora": 5, "fechaVencimiento": "2026-10-15T00:00:00.000Z", "estado": "Pendiente", "vencida": false,
  "departamento": { "numero": "101", "tipo": { "nombre": "B" }, "propietario": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" } },
  "pagos": [],
  "aplicacionesAnticipos": []
}
```
4.5 Creación individual (CA04)
`POST /api/v1/expensas` · Roles: Administrador, Directorio.
Emite una expensa calculando `montoBase` del tipo y `montoAgua` del monto registrado en `montos_agua` para ese departamento y período. Si no hay monto registrado, emite únicamente con monto base y reporta advertencia en `advertencias[]` (sin mencionar lecturas). Si ya existe expensa para el departamento en el período: `409 Conflict`. Devuelve `montoBase`, `montoAgua`, `monto` y `concepto` ("Expensa mensual Tipo B y Agua" si `montoAgua > 0`, sin m3).
```json
{ "idDepartamento": 1, "periodo": "2026-11-01", "fechaVencimiento": "2026-11-15" }
```
Respuesta 201:
```json
{
  "idExpensa": 14, "idDepartamento": 1, "periodo": "2026-11-01T00:00:00.000Z",
  "montoBase": 350.0, "montoAgua": 85.5, "monto": 435.5, "saldoPendiente": 435.5,
  "concepto": "Expensa mensual Tipo B y Agua",
  "tasaInteresMora": 5, "fechaVencimiento": "2026-11-15T00:00:00.000Z", "estado": "Pendiente",
  "advertencias": []
}
```
4.6 Registro de pagos y anticipos (CA05-CA08, RN10)
`POST /api/v1/expensas/:id/pagos` · Roles: Administrador, Directorio.
Pago directo: descuenta del saldo y pasa a `Parcial` o `Pagado` (audita `REGISTRO_PAGO_EXPENSA`). Anticipo (`idExpensa: null` o `esAnticipado: true`): queda como saldo a favor (audita `REGISTRO_ANTICIPO`).
Validaciones (`422 Unprocessable Entity`):
- `idPersonaPagador` es estrictamente obligatorio (número entero positivo y existencia validada en la tabla `personas`). Si falta o no existe, responde `422 Unprocessable Entity`.
- `montoPagado` debe ser mayor a 0 (`montoPagado > 0`).
- La expensa no puede estar ya `Pagado` ni tener saldo ≤ 0.
- `montoPagado` no puede exceder `saldoPendiente`.
Pago directo:
```json
{
  "idPersonaPagador": 1,
  "montoPagado": 300.0,
  "interesPagado": 0,
  "metodoPago": "Transferencia",
  "esAnticipado": false,
  "comprobanteUrl": "https://storage.edificioxyz.com/comprobantes/pago-101-oct.pdf"
}
```
Respuesta 201:
```json
{
  "message": "Pago registrado exitosamente",
  "pago": {
    "idPago": 45,
    "idExpensa": 14,
    "idDepartamento": 1,
    "idPersonaPagador": 1,
    "montoPagado": 300.0,
    "metodoPago": "Transferencia",
    "fechaPago": "2026-10-06T10:00:00.000Z",
    "anulado": false
  },
  "expensa": {
    "idExpensa": 14,
    "saldoPendiente": 0.0,
    "estado": "Pagado"
  }
}
```
Anticipo:
```json
{
  "idDepartamento": 1,
  "idExpensa": null,
  "idPersonaPagador": 1,
  "montoPagado": 1000.0,
  "metodoPago": "Transferencia",
  "esAnticipado": true
}
```
Respuesta 201:
```json
{
  "message": "Pago anticipado registrado exitosamente sin asignar a expensa",
  "pago": {
    "idPago": 46,
    "idExpensa": null,
    "idDepartamento": 1,
    "idPersonaPagador": 1,
    "montoPagado": 1000.0,
    "esAnticipado": true,
    "anulado": false
  }
}
```
Error por pagador ausente o no existente (`422`):
```json
{
  "error": "Unprocessable Entity",
  "message": "El idPersonaPagador es obligatorio y debe ser un número entero positivo"
}
```
> `interesPagado` es únicamente informativo: no amortiza mora, ni saldo, ni capital pendiente.
4.7 Aplicación manual de anticipo
`POST /api/v1/expensas/:id/aplicar-anticipo/:idPago` · Roles: Administrador, Directorio.
Valida que el pago sea un anticipo activo, del mismo departamento, y que el monto no exceda el saldo del anticipo ni el de la expensa. Audita `APLICACION_ANTICIPO_MANUAL`.
```json
{ "monto": 250.0 }
```
Respuesta 200:
```json
{
  "message": "Anticipo aplicado exitosamente a la expensa",
  "aplicacion": { "idAplicacion": 8, "idPago": 46, "idExpensa": 14, "monto": 250.0 },
  "expensa": { "idExpensa": 14, "saldoPendiente": 0, "estado": "Pagado" },
  "saldoDisponibleRestante": 750.0
}
```
4.8 Morosos y deudas vencidas
`GET /api/v1/expensas/morosos` · Roles: Administrador, Directorio.
Agrupa por departamento las expensas vencidas con saldo pendiente. Cada detalle incluye `capitalPendiente`.
```json
{
  "totalMorosos": 1, "totalDeudaGeneral": 840.0,
  "data": [
    {
      "idDepartamento": 3, "numero": "201", "piso": 2,
      "propietario": { "idPersona": 5, "nombres": "Elena", "apellidos": "Torres", "telefono": "+591 76543210", "correo": "elena.torres@email.com" },
      "totalDeuda": 840.0, "expensasMoraCount": 2,
      "detalleExpensas": [
        { "idExpensa": 5, "periodo": "2026-08-01T00:00:00.000Z", "montoTotal": 400.0, "saldoPendiente": 420.0, "fechaVencimiento": "2026-08-15T00:00:00.000Z", "tasaInteresMora": 5.0 }
      ]
    }
  ]
}
```
4.9 Estado de cuenta por departamento (US2.2)
`GET /api/v1/expensas/estado-cuenta/:idDepartamento` · Roles: Administrador, Directorio, Copropietario.
Query params opcionales: `?periodo=YYYY-MM`, `?desde=YYYY-MM-DD`, `?hasta=YYYY-MM-DD`, `?estado=Pendiente|Pagado|Moroso`.
Resumen financiero cronológico: obligaciones, pagos vigentes, saldo pendiente, anticipos totales y disponibles, historial cronológico unificado (`movimientos`), bandera `sinMovimientos`, pagador asociado y `ocupanteActual` con contrato/asignación vigente. Cada expensa incluye `montoBase`, `montoAgua`, `monto` (total), `concepto` ("Expensa mensual Tipo B" y "Agua" si `montoAgua > 0`, sin m3) y `capitalPendiente`.
```json
{
  "departamento": {
    "idDepartamento": 1,
    "numero": "101",
    "piso": 1,
    "tipo": { "nombre": "B" },
    "propietario": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" },
    "ocupanteActual": { "tipoOcupante": "Propietario", "persona": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" } }
  },
  "filtrosAplicados": { "periodo": null, "desde": null, "hasta": null, "estado": null },
  "sinMovimientos": false,
  "resumen": { "totalObligaciones": 1102.5, "totalPagado": 852.5, "saldoPendienteTotal": 250.0, "totalAnticipos": 1000.0, "totalAnticiposDisponibles": 750.0, "estadoGlobal": "Deuda Pendiente" },
  "movimientos": [],
  "expensas": [], "pagos": [], "anticipos": [], "anticiposDisponibles": []
}
```
> **Implementado al 100%:** filtros por query params (`periodo`, `desde`, `hasta`, `estado`), línea de tiempo de `movimientos`, detección de `sinMovimientos`, persona pagadora y `ocupanteActual`.
4.10 Anulación de pago (CA13)
`DELETE /api/v1/expensas/pagos/:idPago` · Roles: Administrador, Directorio.
Anulación lógica con motivo obligatorio; recalcula saldo y estado de la expensa. Audita `ANULACION_PAGO`.
```json
{ "motivo": "Error en número de comprobante y monto duplicado por el banco" }
```
Respuesta 200:
```json
{
  "message": "Pago anulado exitosamente y saldo recalculado",
  "pagoAnulado": { "idPago": 45, "anulado": true, "motivoAnulacion": "Error en número de comprobante y monto duplicado por el banco", "fechaAnulacion": "2026-10-06T11:20:00.000Z" },
  "expensa": { "idExpensa": 14, "saldoPendiente": 550.0, "estado": "Pendiente" }
}
```
> Pendiente: anular un anticipo que ya fue aplicado (se bloqueará con `409`).
4.11 Corrección de pago (CA13, RN10)
`PATCH /api/v1/expensas/pagos/:idPago/corregir` · Roles: Administrador, Directorio.
En una transacción: anula el pago original, crea el nuevo enlazado por `idPagoOriginal` con `idPersonaPagador` y recalcula la expensa.
Validaciones (`422 Unprocessable Entity`):
- `idPersonaPagador` obligatorio (número entero positivo y existencia validada en `personas`).
- `montoPagado > 0`.
- `montoPagado` no puede exceder el saldo sin el pago original (`saldoSinPagoOriginal`).
Audita `CORRECCION_PAGO`.
Request:
```json
{
  "idPersonaPagador": 1,
  "motivo": "Corrección de monto: el depósito real fue de 280 Bs en lugar de 300 Bs",
  "montoPagado": 280.0,
  "metodoPago": "Transferencia",
  "interesPagado": 0,
  "esAnticipado": false
}
```
Respuesta 200:
```json
{
  "message": "Pago corregido exitosamente",
  "pagoAnulado": {
    "idPago": 45,
    "anulado": true,
    "motivoAnulacion": "Corrección de monto: el depósito real fue de 280 Bs en lugar de 300 Bs"
  },
  "nuevoPago": {
    "idPago": 47,
    "idPagoOriginal": 45,
    "idExpensa": 14,
    "idPersonaPagador": 1,
    "montoPagado": 280.0,
    "anulado": false
  },
  "expensa": {
    "idExpensa": 14,
    "saldoPendiente": 20.0,
    "estado": "Parcial"
  }
}
```
4.12 Fórmulas aplicadas
Capital pendiente (función única `calcularCapitalPendiente`, usada en mora, anulación/corrección, morosos y estado de cuenta):
`capital = max(0, monto − pagos directos válidos − anticipos aplicados válidos)`, redondeado a 2 decimales. Pagos o anticipos anulados no cuentan.
Mora:
Aplica si `hoy > fechaVencimiento` (sin días de espera).
`montoMora = capital × tasa / 100` (único porcentaje por expensa vencida, sin recargo periódico ni crecer con el tiempo).
`saldoPendiente = capital + montoMora`.
Estado: `Moroso` si está vencida y el saldo > 0; `Pagado` si el saldo es 0.
Tasa: la de la expensa manda (si es > 0); si es 0, la de la regla activa; si no hay ninguna, error explícito (sin valor por defecto silencioso). Al emitirse (`generar-masivo` o `POST /expensas`), se copia la tasa de la regla activa a `tasaInteresMora` y se conserva inalterable aunque luego cambie la regla activa.
FIFO de anticipos: al crear una expensa se consumen los anticipos activos (`idExpensa` nulo, `esAnticipado`, no anulados) ordenados por `fechaPago` e `idPago` ascendentes, hasta cubrir el saldo o agotarlos. Estado resultante: `Pagado` si el saldo es 0, `Parcial` si bajó, `Pendiente` si no se aplicó nada.
Monto de expensa: el monto es fijo y sale directamente del tipo de departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400). No hay cálculo por área ni factores de superficie. Cada expensa conserva su monto original emitido de forma inmutable.
Recálculo dinámico y efecto de pagos posteriores: la mora se recalcula en cada ejecución sobre el capital vivo; un pago posterior reduce o elimina la mora ya calculada.
Ejemplo (550 / 300): expensa de Bs 550, tasa 5 %. Al vencer sin pagos, mora = 27.50 (saldo 577.50). Se aplican 250 (pago o anticipo): capital 300. La siguiente ejecución da mora = 15.00 (saldo 315.00). Si se cubren los 550, la mora pasa a 0.
Caso del bug corregido: expensa 550 con anticipo aplicado de 250; antes la mora se calculaba sobre 550 (27.50, saldo 577.50); ahora sobre 300 (15.00, saldo 315.00).
Idempotencia: ejecutar el cálculo varias veces consecutivas sobre las mismas expensas sin pagos intermedios arroja exactamente el mismo resultado, ya que `montoMora` se sobrescribe sobre el capital pendiente limpio. Como la tasa fijada en la expensa manda (`tasaInteresMora`), modificar la regla activa general posteriormente no altera la mora de las expensas ya emitidas (su tasa es inmutable); únicamente nuevos pagos o anticipos aplicados que reduzcan el capital pendiente modificarán el saldo o el monto de mora recalculado.
`interesPagado`: se almacena de forma informativa; no amortiza mora, ni saldo, ni capital.
Ejemplo de independencia de mora por período (febrero y marzo): un mismo departamento con dos expensas vencidas (febrero por Bs 300 y marzo por Bs 300) genera un 5 % de mora independiente en cada una (Bs 15 de mora en febrero y Bs 15 en marzo, resultando en saldos de Bs 315 en cada período). La mora no crece acumulativamente con el paso de los meses ni se calcula sobre la mora de otros períodos. El endpoint `/morosos` consolida ambas obligaciones en `totalDeuda = Bs 630.00`.
4.13 Configuración de mora (CA09)
`GET /api/v1/expensas/reglas-mora` · Roles: Administrador, Directorio. Devuelve la regla activa y el historial.
```json
{
  "activa": { "idRegla": 2, "tasaInteres": "5", "diasGracia": 0, "activa": true, "fechaCreacion": "2026-10-05T01:08:16.728Z", "idUsuarioCreacion": null, "usuarioCreacion": null },
  "historial": [{ "idRegla": 2, "tasaInteres": "5", "diasGracia": 0, "activa": true, "fechaCreacion": "2026-10-05T01:08:16.728Z", "idUsuarioCreacion": null, "usuarioCreacion": null }]
}
```
`POST /api/v1/expensas/reglas-mora` · Roles: Administrador, Directorio.
Crea y activa una regla; desactiva la anterior en la misma transacción (una sola activa). Valida `tasaInteres` entre 0 y 100. Acepta pero ignora `diasGracia` y almacena/devuelve siempre `0`. Audita `CONFIGURAR_REGLA_MORA`.
```json
{ "tasaInteres": 6, "diasGracia": 0 }
```
Errores: `400/422` por valores fuera de rango; `401` sin token; `403` sin permiso.
> Valor inicial: 5 %, sin días de espera.
4.14 Tarea programada de mora (CA10)
Tecnología: `node-cron`, zona horaria `America/La_Paz`.
Variables: `MORA_CRON` (por defecto `"0 1 * * *"`) y `MORA_CRON_ENABLED` (por defecto `false`).
Ejecuta el mismo servicio `ejecutarCalculoMora` que el endpoint manual y audita `CALCULO_MORA_EXPENSAS` con `idUsuario: null` y `origen: SISTEMA_CRON`.
4.15 Reglas de validación financiera
Regla	Endpoint	Resultado
Monto positivo	`POST .../pagos`, `PATCH .../corregir`	`422` si `montoPagado <= 0`
Expensa ya pagada	`POST .../pagos`	`422`
Sobrepago	`POST .../pagos`	`422` si `montoPagado > saldoPendiente`
Pagador obligatorio (RN10)	`POST .../pagos`, `PATCH .../corregir`	`422` si falta `idPersonaPagador` o persona no existe
Corrección contra saldo sin el pago original	`PATCH .../corregir`	`422` si lo excede
Expensa duplicada (departamento + período)	`POST /expensas`	`409`
Detección de vencidas	`GET /expensas`, `GET /expensas/:id`	Campo `vencida`; filtro `?vencida=true`
Monto de expensa por tipo positivo	`PUT .../montos-tipo`	`400` si monto <= 0 o inválido
Control de duplicados e integridad física: La BD real ya cuenta con la restricción `UNIQUE (id_departamento, periodo)`. El control de duplicados se realiza tanto por consulta previa como por restricción física de motor (el error de unicidad `P2002` se mapea y responde como `409 Conflict` en endpoints individuales y masivos, probado).

4.16 Gestión de Tipos de Departamento y Montos de Expensa
`GET /api/v1/tipos-departamento` · Roles: Administrador, Directorio.
Lista los tipos de departamento con `idTipo`, `nombre`, `montoExpensa`, `areaM2`, `activo` y `departamentosAsignados`.
Respuesta 200:
```json
{
  "data": [
    { "idTipo": 1, "nombre": "A", "montoExpensa": 300.0, "areaM2": null, "activo": true, "departamentosAsignados": 10 },
    { "idTipo": 2, "nombre": "B", "montoExpensa": 350.0, "areaM2": null, "activo": true, "departamentosAsignados": 5 },
    { "idTipo": 3, "nombre": "C", "montoExpensa": 400.0, "areaM2": null, "activo": true, "departamentosAsignados": 5 }
  ]
}
```

`POST /api/v1/tipos-departamento` · Roles: Administrador, Directorio.
Crea un nuevo tipo de departamento.
- `nombre`: libre hasta 60 caracteres y único (ej. "Suite Presidencial Premium"). Responde `409 Conflict` si ya existe.
- `montoExpensa`: mayor a cero obligatorio (`montoExpensa > 0`). Responde `400` si es `<= 0`.
- `areaM2`: numérico opcional (puede ser nulo o mayor a cero).
- `activo`: booleano opcional (por defecto `true`).
- Auditoría: Registra `CREAR_TIPO_DEPARTAMENTO`.
Request:
```json
{
  "nombre": "Suite Presidencial Premium",
  "montoExpensa": 850.0,
  "areaM2": 120.5,
  "activo": true
}
```
Respuesta 201:
```json
{
  "message": "Tipo de departamento creado exitosamente",
  "idTipo": 4,
  "nombre": "Suite Presidencial Premium",
  "montoExpensa": 850.0,
  "areaM2": 120.5,
  "activo": true
}
```

`PUT /api/v1/tipos-departamento/:id` o `PUT /api/v1/tipos-departamento` (con `{ idTipo, ... }`) · Roles: Administrador, Directorio.
Actualiza nombre, montoExpensa, areaM2 o activo de un tipo.
- Si `activo=false` y el tipo tiene departamentos asignados, responde `409 Conflict` (`No se puede desactivar el tipo porque tiene N departamento(s) asignado(s)`).
- Auditoría: Registra `ACTUALIZAR_TIPO_DEPARTAMENTO` con `datosAnteriores` y `datosNuevos`.

Alias compatibles de Frontend:
`GET /api/v1/expensas/montos-tipo` y `PUT /api/v1/expensas/montos-tipo` se mantienen plenamente operativos como alias para asegurar compatibilidad con versiones previas del Front.
`GET /api/v1/expensas/montos-tipo` · Roles: Administrador, Directorio.
Lee la lista de tipos de departamento con sus montos de expensa asignados en `tipos_departamento`.
Respuesta 200:
```json
{
  "data": [
    { "idTipo": 1, "nombre": "A", "montoExpensa": 300.0 },
    { "idTipo": 2, "nombre": "B", "montoExpensa": 350.0 },
    { "idTipo": 3, "nombre": "C", "montoExpensa": 400.0 }
  ]
}
```
`PUT /api/v1/expensas/montos-tipo` · Roles: Administrador, Directorio.
Actualiza los montos de expensa para uno o varios tipos de departamento. Acepta `{ "tipos": [...] }`, un array de objetos o un objeto individual con `idTipo` (o `nombre`) y `monto` (o `montoExpensa`).
Validaciones:
- Valida estrictamente `monto > 0` (`400 Validation Error` si es menor o igual a cero o inválido).
- Responde `404 Not Found` si el tipo de departamento especificado no existe.
Inmutabilidad: Modificar el monto no altera las expensas ya emitidas; aplica exclusivamente a emisiones futuras.
Auditoría: Registra el evento `CONFIGURAR_MONTO_EXPENSA` sobre `tipos_departamento` con `idRegistro: String(idTipo)`, `datosAnteriores` y `datosNuevos` dentro de la transacción.
Request:
```json
{
  "tipos": [
    { "idTipo": 1, "monto": 320.0 }
  ]
}
```
Respuesta 200:
```json
{
  "message": "Montos de expensa por tipo actualizados exitosamente",
  "actualizados": [
    { "idTipo": 1, "nombre": "A", "montoExpensa": 320.0 }
  ]
}
```
Error 400: `{ "error": "Validation Error", "message": "El monto de la expensa debe ser mayor a cero" }`

4.17 Asignación de tipo a departamentos (Ventana de Front)
`PUT /api/v1/departamentos/:id/tipo` · Roles: Administrador, Directorio.
Asigna un tipo a un departamento individual.
Request: `{ "idTipo": 2 }`
Reglas:
- Solo tipos activos: si el tipo no existe o está inactivo (`activo: false`), responde `422 Unprocessable Entity`.
- Herencia de área: si el departamento no tiene área (`areaM2` es nulo) y el tipo tiene `areaM2`, el departamento hereda automáticamente el área del tipo.
- Auditoría: Registra `ASIGNAR_TIPO_DEPARTAMENTO`.
Respuesta 200:
```json
{
  "message": "Tipo de departamento asignado exitosamente",
  "idDepartamento": 1,
  "numero": "101",
  "idTipo": 2,
  "tipo": "B",
  "monto": 350.0,
  "areaM2": 85.0
}
```

`PUT /api/v1/departamentos/asignar-tipo` · Roles: Administrador, Directorio.
Asignación masiva en una única transacción atómica (todo o nada).
Request:
```json
{
  "asignaciones": [
    { "idDepartamento": 1, "idTipo": 2 },
    { "idDepartamento": 2, "idTipo": 3 }
  ]
}
```
Reglas:
- Operación atómica: si cualquier asignación falla (tipo inexistente o inactivo `activo: false`), la transacción completa hace rollback y responde `422 Unprocessable Entity`.
- Hereda `area_m2` del tipo si el departamento no tiene área asignada.
- Auditoría por cada departamento modificado: `ASIGNAR_TIPO_DEPARTAMENTO`.
Respuesta 200:
```json
{
  "message": "Se asignó el tipo a 2 departamento(s) exitosamente",
  "actualizados": 2,
  "asignaciones": [
    { "idDepartamento": 1, "numero": "101", "idTipo": 2, "tipo": "B", "monto": 350.0, "areaM2": 85.0 },
    { "idDepartamento": 2, "numero": "102", "idTipo": 3, "tipo": "C", "monto": 400.0, "areaM2": 95.0 }
  ]
}
```
---
## 5. Módulo de Ingresos y Egresos (US2.3, HU05)
Movimientos financieros ordinarios y extraordinarios con balance y auditoría.
Ubicación: `backend/src/routes/movimientos.routes.ts` · Prefijo: `/api/v1/movimientos`
5.1 Categorías
`GET /api/v1/movimientos/categorias` · Roles: Administrador, Directorio. Query: `tipo` (Ingreso o Egreso). Si la tabla está vacía, inserta el catálogo por defecto.
```json
[
  { "idCategoria": 1, "nombre": "Mantenimiento y Reparaciones", "tipo": "Egreso" },
  { "idCategoria": 2, "nombre": "Servicios Básicos (Luz/Agua)", "tipo": "Egreso" },
  { "idCategoria": 6, "nombre": "Ingreso Extraordinario", "tipo": "Ingreso" },
  { "idCategoria": 7, "nombre": "Alquiler Áreas Comunes / Salón", "tipo": "Ingreso" }
]
```
`POST /api/v1/movimientos/categorias` · Rol: Administrador.
Crea una nueva categoría. Campos: `nombre` (string obligatorio, hasta 80 caracteres), `tipo` ('Ingreso' | 'Egreso'). Validación de unicidad: el nombre debe ser único para el mismo tipo (`409 Conflict` con código `CATEGORIA_DUPLICADA` si ya existe). Audita evento `CREAR_CATEGORIA`. Responde 201 Created.
```json
{ "nombre": "Mantenimiento Preventivo Ascensores", "tipo": "Egreso" }
```
`PUT /api/v1/movimientos/categorias/:id` · Rol: Administrador.
Modifica una categoría existente por su ID en la URL. Campos opcionales: `nombre` (hasta 80 caracteres), `tipo` ('Ingreso' | 'Egreso'). Valida unicidad si cambia de nombre o tipo (`409 Conflict`). Si cambia el `tipo` y la categoría tiene movimientos asociados, responde `409 Conflict` (código `CATEGORIA_CON_MOVIMIENTOS`); si no tiene movimientos asociados, el cambio de tipo se permite. Audita evento `MODIFICAR_CATEGORIA`. Responde 200 OK.
```json
{ "nombre": "Mantenimiento Integral de Ascensores" }
```

5.2 Resumen financiero y balance
`GET /api/v1/movimientos/resumen` · Roles: Administrador, Directorio.
Query: `anio`, `mes` (1-12), `idCategoria`, `fechaDesde`, `fechaHasta`. Considera solo movimientos no anulados.
```json
{
  "periodo": { "mes": "10", "anio": "2026", "fechaDesde": null, "fechaHasta": null },
  "totalIngresos": 15400.0, "totalEgresos": 9200.0, "balance": 6200.0,
  "cantidadIngresos": 24, "cantidadEgresos": 15,
  "porCategoria": [
    { "idCategoria": 1, "tipo": "Egreso", "_sum": { "monto": 4500.0 }, "_count": 6 },
    { "idCategoria": 7, "tipo": "Ingreso", "_sum": { "monto": 3500.0 }, "_count": 4 }
  ]
}
```
5.3 Listado paginado
`GET /api/v1/movimientos` · Roles: Administrador, Directorio.
Query: `tipo` (Ingreso, Egreso, Todos), `idCategoria`, `fechaDesde`, `fechaHasta`, `q`, `page` (1), `limit` (50). Orden por fecha descendente.
El filtro `q` busca coincidencias parciales (case-insensitive) tanto en `descripcion` como en `tercero` y `nro_factura`.
```json
{
  "data": [
    {
      "idMovimiento": 12, "tipo": "Egreso", "idCategoria": 1, "monto": 1200.0,
      "descripcion": "Reparación y mantenimiento del ascensor principal", "fecha": "2026-10-04T15:00:00.000Z",
      "comprobanteUrl": "https://storage.edificioxyz.com/facturas/fac-9912.pdf", "anulado": false,
      "tercero": "Schindler Ascensores Bolivia",
      "nroFactura": "FAC-9912",
      "metodoPago": "Transferencia QR",
      "categoria": { "idCategoria": 1, "nombre": "Mantenimiento y Reparaciones", "tipo": "Egreso" },
      "usuarioRegistro": { "idUsuario": 1, "nombreUsuario": "admin" }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```
5.4 Detalle de movimiento
`GET /api/v1/movimientos/:id` · Roles: Administrador, Directorio.
Incluye categoría, usuario, `tercero`, `nroFactura`, `metodoPago`, `movimientosBancarios` y `pagosEmpleados`.
5.5 Registrar movimiento
`POST /api/v1/movimientos` · Rol: Administrador.
> **Cambio de contrato (US2.3):** `fecha` y `descripcion` son estrictamente obligatorios (anteriormente `fecha` admitía fallback automático a la fecha del servidor y `descripcion` era opcional). Si `fecha` o `descripcion` faltan o están vacías, responde `400 Validation Error` con `details` estructurado.

Campos obligatorios: `tipo` ('Ingreso' | 'Egreso'), `idCategoria` (entero positivo), `monto` (positivo), `fecha` (válida, obligatoria), `descripcion` (string no vacío, obligatorio). Si falta algún campo obligatorio, responde `400 Validation Error` con `details` estructurado por campo.
Campos opcionales:
- `tercero`: string, hasta 120 caracteres.
- `nroFactura`: string (acepta también `nro_factura`), hasta 50 caracteres.
- `metodoPago`: string (acepta también `metodo_pago`), hasta 30 caracteres. No restringido a lista cerrada (texto libre).
- `comprobanteUrl`: string o null.
Se aplica `trim` automático; cadenas vacías o compuestas exclusivamente de espacios se normalizan a `null`. Si exceden su longitud máxima, responde `400 Validation Error` con `details`.
Audita `CREAR_MOVIMIENTO`.
```json
{
  "tipo": "Egreso",
  "idCategoria": 1,
  "monto": 1200.0,
  "descripcion": "Reparación y mantenimiento de bombas de agua",
  "fecha": "2026-10-05T18:00:00.000Z",
  "tercero": "Bombas Hidráulicas Industriales SRL",
  "nroFactura": "FAC-8841",
  "metodoPago": "Transferencia Bancaria QR",
  "comprobanteUrl": "https://storage.edificioxyz.com/recibos/rec-bombas-105.pdf"
}
```
Respuesta 201: el movimiento creado con `anulado: false`, `tercero`, `nroFactura`, `metodoPago`, `idUsuarioRegistro`, `categoria` y `usuarioRegistro`.

5.6 Modificar movimiento
`PUT /api/v1/movimientos/:id` · Rol: Administrador. `409` si ya está anulado. Permite modificar `tipo`, `idCategoria`, `monto`, `descripcion`, `fecha`, `comprobanteUrl`, `tercero`, `nroFactura` y `metodoPago`. Campos opcionales enviados como cadena vacía se convierten a `null`; campos no enviados conservan su valor. Audita `MODIFICAR_MOVIMIENTO` (estado anterior y nuevo).
```json
{ "monto": 850.0, "descripcion": "Alquiler de salón de eventos con extensión horaria", "tercero": "Juan Pérez", "nroFactura": "REC-001" }
```
5.7 Anular movimiento
`DELETE /api/v1/movimientos/:id` · Rol: Administrador. Motivo obligatorio (`motivo` o `motivoAnulacion`); `409` si ya está anulado. Audita `ANULACION_MOVIMIENTO` en transacción atómica.
```json
{ "motivo": "Cancelación de reserva y devolución formal del dinero al solicitante" }
```
Respuesta 200:
```json
{ "success": true, "message": "Movimiento anulado correctamente", "data": { "idMovimiento": 15, "anulado": true, "motivoAnulacion": "Cancelación de reserva y devolución formal del dinero al solicitante", "fechaAnulacion": "2026-10-06T12:00:00.000Z", "idUsuarioAnulacion": 1 } }
```

5.8 Carga y almacenamiento de comprobantes (US2.3-T35)
`POST /api/v1/movimientos/upload-comprobante` y `POST /api/v1/movimientos/comprobantes/upload` · Roles: Administrador, Directorio.
Almacena comprobantes de respaldo para ingresos y egresos.
- Entrada aceptada:
  - `url` (string): URL externa válida (ej. Supabase Storage, CDN o S3). Responde `200 OK` con tipo `URL_EXTERNA`.
  - `archivoBase64` (string con o sin prefijo Data URI) y opcionalmente `nombreArchivo` (string): Convierte a binario y valida tamaño contra `STORAGE_MAX_FILE_SIZE_MB` (máximo 10 MB por defecto; responde `413 Payload Too Large` si excede). Determina extensión por tipo MIME (PDF, PNG, JPG, WebP) o nombre original, generando un archivo único `comp_<timestamp>_<randomHex>.<ext>` en el directorio configurado en `STORAGE_UPLOAD_DIR` (`./uploads/comprobantes`).
- Salida 201 Created:
```json
{
  "success": true,
  "message": "Comprobante almacenado exitosamente",
  "comprobanteUrl": "http://localhost:4000/uploads/comprobantes/comp_1729641600000_a1b2c3d4e5f6g7h8.pdf",
  "nombreArchivo": "comp_1729641600000_a1b2c3d4e5f6g7h8.pdf",
  "mimeType": "application/pdf",
  "pesoBytes": 1048576
}
```
Servido de forma estática en Express bajo `/uploads`.

---
## 6. Subsistema de Logs y Auditoría (US1.3)
Trazabilidad de todas las operaciones que modifican el estado del sistema.
Ubicación: `backend/src/modules/auditoria/` · Tabla: `edificio.auditoria`
6.1 Modelo de datos
Campo	Tipo	Descripción
`idAuditoria`	Int	Clave primaria autoincremental.
`tablaAfectada`	String(50)	Entidad afectada.
`idRegistro`	String(100)?	ID de la entidad involucrada.
`accion`	String(50)	Evento registrado.
`fechaHora`	DateTime	Marca temporal UTC del servidor.
`idUsuario`	Int?	Usuario que ejecutó la acción (`null` en fallos de login y en el cron).
`resultado`	String(30)?	`EXITO`, `CREDENCIALES_INVALIDAS`, `BLOQUEO_TEMPORAL`.
`datosAnteriores`	Json?	Snapshot previo (updates, correcciones, anulaciones).
`datosNuevos`	Json?	Snapshot nuevo, IP, user-agent o motivo.
6.2 Catálogo de eventos
> **Nota sobre duplicidad de filas por triggers:** Las operaciones sobre las tablas `expensas`, `pagos` y `movimientos` pueden generar dos filas en `edificio.auditoria`: una generada por la lógica de negocio del backend con el nombre semántico del evento (`REGISTRO_PAGO_EXPENSA`, `CORRECCION_PAGO`, `GENERACION_MASIVA_EXPENSAS`, `REGISTRO_ANTICIPO`, `CREAR_MOVIMIENTO`, etc.) y otra generada automáticamente por los triggers de base de datos (`trg_auditoria_expensas`, `trg_auditoria_pagos`, `trg_auditoria_movimientos` definidos en `database/migrations/001_initial_schema.sql`) con acción `INSERT`, `UPDATE` o `DELETE`. En las demás tablas (`usuarios`, `personas`, `ocupantes_departamento`, `departamentos`, `parqueos`, `bauleras`, `tipos_departamento`, `reglas_mora`) no existen triggers en la base de datos, registrándose únicamente la fila del backend.

Evento	Tabla	Origen	Descripción / Datos Capturados
`LOGIN_EXITOSO`	usuarios	`POST /auth/login`	Inicio de sesión exitoso (correo, rol, IP, user-agent).
`LOGIN_FALLIDO`	usuarios	`POST /auth/login`	Credenciales incorrectas (motivo, intentos acumulados, IP).
`SESION_RECHAZADA`	sesiones	`POST /auth/login`	Rechazo de login por sesión concurrente activa o conflicto de índice único parcial (409 Conflict).
`SESION_FORZADA`	sesiones	`DELETE /auth/sesiones/:idUsuario`	Cierre forzado de sesión por Administrador (idOperador, idUsuarioAfectado, cerradas, IP, user-agent).
`USUARIO_BLOQUEADO`	usuarios	Al 3.º intento fallido	Bloqueo por fuerza bruta (10 minutos, fecha desbloqueo).
`LOGOUT`	usuarios	`POST /auth/logout`	Cierre de sesión.
`USUARIO_MODIFICADO`	usuarios	`PUT /usuarios/:id`	Modificación de cuenta.
`INSERT`	personas	`POST /personas`	Alta de persona (CI/NIT, nombres, apellidos, teléfono, correo).
`UPDATE`	personas	`PUT /personas/:id`	Actualización de datos (datosAnteriores y datosNuevos).
`ASIGNACION_UNIDAD`	ocupantes_departamento	`POST /personas/:id/unidades`	Asignación de titularidad u ocupación de departamento.
`FINALIZACION_OCUPACION`	ocupantes_departamento	`PATCH /personas/ocupaciones/:id/finalizar`	Fin de ocupación con fechaFin.
`CREATE`	departamentos, parqueos, bauleras	`POST /unidades`	Alta de unidad física (datosNuevos, idTipo).
`UPDATE`	departamentos, parqueos, bauleras	`PUT /unidades/:tipo/:id`	Modificación de unidad física (datosAnteriores y datosNuevos).
`ASIGNACION_UNIDAD`	parqueos, bauleras, departamentos	`POST /unidades/asignaciones`	Asignación atómica de parqueo/baulera a depto/persona.
`FINALIZACION_ASIGNACION`	parqueos, bauleras, departamentos	`POST /unidades/asignaciones/finalizar`	Liberación atómica de unidad.
`CONFIGURAR_MONTO_EXPENSA`	tipos_departamento	`PUT /expensas/montos-tipo`	Configuración de monto de expensa por tipo (datosAnteriores y datosNuevos).
`CREAR_TIPO_DEPARTAMENTO`	tipos_departamento	`POST /tipos-departamento`	Creación de tipo con nombre único, montoExpensa > 0 y areaM2 opcional.
`ACTUALIZAR_TIPO_DEPARTAMENTO`	tipos_departamento	`PUT /tipos-departamento/:id`	Actualización de tipo (nombre, monto, área, activo; valida 409 si tiene deptos).
`ASIGNAR_TIPO_DEPARTAMENTO`	departamentos	`PUT /departamentos/:id/tipo` y `PUT /departamentos/asignar-tipo`	Asignación de tipo activo a depto (individual o masiva atómica con herencia de área).
`REGISTRO_MONTO_AGUA`	montos_agua	`PUT /agua/montos`	Registro o actualización de monto mensual de agua por departamento (datosAnteriores y datosNuevos).
`GENERACION_MASIVA_EXPENSAS`	expensas	`POST /expensas/generar-masivo`	Emisión mensual masiva fija por tipo (período, generadasCount, excepcionesCount).
`CREAR_EXPENSA`	expensas	`POST /expensas`	Emisión individual de expensa.
`CALCULO_MORA_EXPENSAS`	expensas	`POST /expensas/calcular-mora` y cron	Cálculo de mora sobre capital pendiente sin días de espera (origen `MANUAL` o `SISTEMA_CRON`).
`REGISTRO_PAGO_EXPENSA`	pagos	`POST /expensas/:id/pagos`	Pago directo (monto, expensa, idPersonaPagador).
`REGISTRO_ANTICIPO`	pagos	`POST /expensas/:id/pagos` (anticipo)	Pago a favor sin expensa asignada (idPersonaPagador, esAnticipado).
`APLICACION_ANTICIPO_MANUAL`	aplicaciones_anticipos	`POST /expensas/:id/aplicar-anticipo/:idPago`	Consumo manual de anticipo.
`ANULACION_PAGO`	pagos	`DELETE /expensas/pagos/:idPago`	Anulación con motivo y reversión de saldo.
`CORRECCION_PAGO`	pagos	`PATCH /expensas/pagos/:idPago/corregir`	Corrección enlazada por idPagoOriginal con idPersonaPagador.
`CONFIGURAR_REGLA_MORA`	reglas_mora	`POST /expensas/reglas-mora`	Configuración de tasa porcentual de mora (diasGracia = 0).
`CREAR_MOVIMIENTO`	movimientos	`POST /movimientos`	Registro de ingreso/egreso.
`MODIFICAR_MOVIMIENTO`	movimientos	`PUT /movimientos/:id`	Modificación de movimiento con delta.
`ANULACION_MOVIMIENTO`	movimientos	`DELETE /movimientos/:id`	Anulación de movimiento con motivo.
`CREAR_CATEGORIA`	categorias_movimiento	`POST /movimientos/categorias`	Creación de categoría de ingreso/egreso con nombre único por tipo.
`MODIFICAR_CATEGORIA`	categorias_movimiento	`PUT /movimientos/categorias/:id`	Modificación de categoría (nombre único, valida movimientos asociados ante cambio de tipo).
6.3 Ejemplos
Bloqueo de cuenta:
```json
{
  "idAuditoria": 9017, "tablaAfectada": "usuarios", "idRegistro": "3", "accion": "USUARIO_BLOQUEADO",
  "fechaHora": "2026-09-27T19:40:12.180Z", "idUsuario": 3, "resultado": "BLOQUEO_TEMPORAL", "datosAnteriores": null,
  "datosNuevos": { "correo": "residente@edificioxyz.com", "intentos": 3, "bloqueadoHasta": "2026-09-27T19:50:12.180Z", "duracionMinutos": 10, "ip": "190.181.24.12", "userAgent": "Mozilla/5.0 ..." }
}
```
Actualización de datos de persona:
```json
{
  "idAuditoria": 9022, "tablaAfectada": "personas", "idRegistro": "2", "accion": "ACTUALIZAR_PERSONA",
  "fechaHora": "2026-09-27T19:42:05.412Z", "idUsuario": 1, "resultado": "EXITO",
  "datosAnteriores": { "telefono": "+591 79876543", "direccion": "Calle Sucre 456" },
  "datosNuevos": { "telefono": "+591 77112233", "direccion": "Av. América 890" }
}
```
Anulación de pago:
```json
{
  "idAuditoria": 9035, "tablaAfectada": "pagos", "idRegistro": "45", "accion": "ANULACION_PAGO",
  "fechaHora": "2026-10-06T11:20:00.000Z", "idUsuario": 1, "resultado": "EXITO",
  "datosAnteriores": { "anulado": false, "montoPagado": 300.0, "idExpensa": 14, "saldoPendienteExpensa": 250.0 },
  "datosNuevos": { "anulado": true, "motivoAnulacion": "Error en número de comprobante y monto duplicado por el banco", "idUsuarioAnulacion": 1, "saldoPendienteExpensa": 550.0 }
}
```
Configuración de regla de mora:
```json
{
  "idAuditoria": 9030, "tablaAfectada": "reglas_mora", "idRegistro": "2", "accion": "CONFIGURAR_REGLA_MORA",
  "fechaHora": "2026-10-04T12:00:00.000Z", "idUsuario": 1, "resultado": "EXITO",
  "datosAnteriores": { "idRegla": 1, "tasaInteres": 5.0, "diasGracia": 0, "activa": true },
  "datosNuevos": { "idRegla": 2, "tasaInteres": 6.0, "diasGracia": 0, "activa": true }
}
```

Configuración de monto de expensa por tipo:
```json
{
  "idAuditoria": 9040, "tablaAfectada": "tipos_departamento", "idRegistro": "1", "accion": "CONFIGURAR_MONTO_EXPENSA",
  "fechaHora": "2026-10-11T18:00:00.000Z", "idUsuario": 1, "resultado": "EXITO",
  "datosAnteriores": { "idTipo": 1, "nombre": "A", "montoExpensa": 300.0 },
  "datosNuevos": { "idTipo": 1, "nombre": "A", "montoExpensa": 320.0 }
}
```
6.4 Consulta de auditoría (US1.3)
`GET /api/v1/auditoria` · Roles: Administrador, Directorio.
Lista cronológica de eventos de auditoría con soporte de paginación y filtros multicriterio.
Parámetros de consulta (Query params):
- `page`: Número de página (entero >= 1, por defecto 1).
- `limit`: Cantidad de registros por página (entero entre 1 y 100, por defecto 50).
- `tablaAfectada`: Nombre exacto de la tabla (ej. `expensas`, `usuarios`, `personas`, `tipos_departamento`).
- `accion`: Nombre de la acción o evento (ej. `LOGIN_EXITOSO`, `REGISTRO_PAGO_EXPENSA`, `CONFIGURAR_MONTO_EXPENSA`).
- `idUsuario`: Identificador numérico del usuario que realizó la acción.
- `idRegistro`: Identificador de la entidad afectada (string o numérico).
- `resultado`: Resultado de la operación (`EXITO`, `CREDENCIALES_INVALIDAS`, `BLOQUEO_TEMPORAL`).
- `fechaDesde`: Fecha inicial para acotar la búsqueda (`YYYY-MM-DD` o formato ISO).
- `fechaHasta`: Fecha final para acotar la búsqueda (`YYYY-MM-DD` o formato ISO).
Ordenamiento: cronológico descendente (`fechaHora` desc).
Seguridad y enmascaramiento: los campos sensibles (`password`, `hash`, `token`, `contrasena`) dentro de `datosAnteriores` y `datosNuevos` son sustituidos automáticamente por `"***"` antes de enviar la respuesta.
Respuesta 200:
```json
{
  "data": [
    {
      "idAuditoria": 105,
      "tablaAfectada": "expensas",
      "idRegistro": "14",
      "accion": "REGISTRO_PAGO_EXPENSA",
      "fechaHora": "2026-10-11T19:30:00.000Z",
      "idUsuario": 1,
      "resultado": "EXITO",
      "datosAnteriores": null,
      "datosNuevos": {
        "idPago": 45,
        "montoPagado": 300.0,
        "idPersonaPagador": 1
      },
      "usuario": {
        "idUsuario": 1,
        "nombre": "Admin Principal"
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

`GET /api/v1/auditoria/:id` · Roles: Administrador, Directorio.
Detalle completo de un evento de auditoría específico por su identificador primario (`idAuditoria`).
- Aplica el mismo enmascaramiento de confidencialidad en `datosAnteriores` y `datosNuevos`.
- Responde `404 Not Found` si el registro no existe.
Respuesta 200:
```json
{
  "idAuditoria": 105,
  "tablaAfectada": "expensas",
  "idRegistro": "14",
  "accion": "REGISTRO_PAGO_EXPENSA",
  "fechaHora": "2026-10-11T19:30:00.000Z",
  "idUsuario": 1,
  "resultado": "EXITO",
  "datosAnteriores": null,
  "datosNuevos": {
    "idPago": 45,
    "montoPagado": 300.0,
    "idPersonaPagador": 1
  },
  "usuario": {
    "idUsuario": 1,
    "nombre": "Admin Principal"
  }
}
```
Errores comunes:
- Error 401: `{ "error": "Unauthorized", "message": "Token de autenticación no proporcionado" }` (petición sin token Bearer válido).
- Error 403: `{ "error": "Forbidden", "message": "No tiene permisos para acceder a este recurso" }` (rol Consulta u otros roles sin permiso).
- Error 404: `{ "error": "Not Found", "message": "Registro de auditoría no encontrado" }` (cuando no existe el ID).

Inmutabilidad de la auditoría:
El subsistema de auditoría es estrictamente de solo lectura en la API pública. No se exponen endpoints `POST`, `PUT`, `PATCH` ni `DELETE` bajo `/api/v1/auditoria`. Los eventos se registran de manera programática únicamente desde la capa de servicios y repositorios del backend mediante transacciones atómicas.

---
## 7. Matriz de Control de Acceso por Roles (RBAC)
Módulo	Endpoint	Método	Administrador	Directorio	Consulta
Auth	/auth/login	POST	✅	✅	✅
Auth	/auth/logout	POST	✅	✅	✅
Auth	/auth/me	GET	✅	✅	✅
Auth	/auth/sesiones/:idUsuario	DELETE	✅	❌	❌
Personas	/personas	GET	✅	✅	✅
Personas	/personas/:id	GET	✅	✅	✅
Personas	/personas/:id/historial	GET	✅	✅	✅
Personas	/personas/departamentos/:idDepartamento/historial	GET	✅	✅	✅
Personas	/personas	POST	✅	✅	❌
Personas	/personas/:id	PUT	✅	✅	❌
Personas	/personas/:id/unidades	POST	✅	✅	❌
Personas	/personas/ocupaciones/:id/finalizar	PATCH	✅	✅	❌
Unidades	/unidades	GET	✅	✅	✅
Unidades	/unidades/:tipo/:id	GET	✅	✅	✅
Unidades	/unidades	POST	✅	✅	❌
Unidades	/unidades/:tipo/:id	PUT	✅	✅	❌
Unidades	/unidades/asignaciones	POST	✅	✅	❌
Unidades	/unidades/asignaciones/finalizar	POST	✅	✅	❌
Tipos Depto	/tipos-departamento	GET	✅	✅	❌
Tipos Depto	/tipos-departamento	POST	✅	✅	❌
Tipos Depto	/tipos-departamento/:id	PUT	✅	✅	❌
Departamentos	/departamentos/:id/tipo	PUT	✅	✅	❌
Departamentos	/departamentos/asignar-tipo	PUT	✅	✅	❌
Agua	/agua/montos	PUT	✅	✅	❌
Agua	/agua/montos	GET	✅	✅	✅
Expensas	/expensas	GET	✅	✅	❌ *
Expensas	/expensas/:id	GET	✅	✅	❌ *
Expensas	/expensas/morosos	GET	✅	✅	❌
Expensas	/expensas/estado-cuenta/:idDepartamento	GET	✅	✅	❌ *
Expensas	/expensas/reglas-mora	GET	✅	✅	❌
Expensas	/expensas/reglas-mora	POST	✅	✅	❌
Expensas	/expensas/montos-tipo	GET	✅	✅	❌
Expensas	/expensas/montos-tipo	PUT	✅	✅	❌
Expensas	/expensas/generar-masivo	POST	✅	✅	❌
Expensas	/expensas/calcular-mora	POST	✅	✅	❌
Expensas	/expensas	POST	✅	✅	❌
Expensas	/expensas/:id/pagos	POST	✅	✅	❌
Expensas	/expensas/:id/aplicar-anticipo/:idPago	POST	✅	✅	❌
Expensas	/expensas/pagos/:idPago	DELETE	✅	✅	❌
Expensas	/expensas/pagos/:idPago/corregir	PATCH	✅	✅	❌
Movimientos	/movimientos/categorias	GET	✅	✅	❌
Movimientos	/movimientos/categorias	POST	✅	❌	❌
Movimientos	/movimientos/categorias/:id	PUT	✅	❌	❌
Movimientos	/movimientos/resumen	GET	✅	✅	❌
Movimientos	/movimientos	GET	✅	✅	❌
Movimientos	/movimientos/:id	GET	✅	✅	❌
Movimientos	/movimientos	POST	✅	❌	❌
Movimientos	/movimientos/:id	PUT	✅	❌	❌
Movimientos	/movimientos/:id	DELETE	✅	❌	❌
Movimientos	/movimientos/upload-comprobante	POST	✅	✅	❌
Movimientos	/movimientos/comprobantes/upload	POST	✅	✅	❌
Auditoria	/auditoria	GET	✅	✅	❌
Auditoria	/auditoria/:id	GET	✅	✅	❌
Health/Failover	/health/db	GET	✅	❌	❌
Health/Failover	/health/db/principal	POST	✅	❌	❌

* Pendiente de confirmar contra el código y con el Scrum si Consulta tendrá lectura de expensas y estado de cuenta (requisito mínimo del cliente: emisión de estados de cuenta).
---
## 8. Trazabilidad US ↔ Criterio ↔ Endpoint
US2.1: Generación y control de expensas
CA	Endpoint(s)	Estado	Nota
01 Generación	`generar-masivo`	Cumple	Monto fijo por tipo de departamento A/B/C más monto manual de agua registrado (probado).
02 Asociación a la unidad	`generar-masivo`, `POST /expensas`	Cumple	Asociación a departamento (probado).
03 Unidades aplicables	`generar-masivo`	Cumple	Departamentos sin tipo van a excepciones[] con motivo claro (probado).
04 Duplicados	`POST /expensas`, `generar-masivo`	Cumple	Omite duplicados en masivo y 409 en creación individual; respaldado por la restricción `UNIQUE (id_departamento, periodo)` de la BD real con error P2002 convertido a 409 (probado).
05-07 Pagos (parcial/total)	`POST .../pagos`	Cumple	Validaciones 422 e idPersonaPagador obligatorio (probado).
08 Anticipo	`POST .../pagos`, `aplicar-anticipo`	Cumple	FIFO automático y aplicación manual (probado).
09 Configuración de mora	`reglas-mora`	Cumple	Regla activa e historial cronológico (probado).
10 Mora automática	`calcular-mora`, cron	Cumple	Cálculo sobre capital pendiente y cron en background (probado).
11 Vencidas	campo `vencida`, `?vencida=true`, `morosos`	Cumple	Detección aditiva por fecha y saldo (probado).
12 Saldo actualizado	pagos, anulación, corrección	Cumple	Saldo actualizado con pagos y anticipos (probado).
13 Corrección o cancelación	`DELETE`, `PATCH corregir`	Parcial	DELETE y PATCH corregir con idPersonaPagador probados; pendiente anulación de anticipo ya aplicado.
14 Trazabilidad	auditoría	Cumple	Auditoría transversal, CONFIGURAR_MONTO_EXPENSA, CREAR_TIPO_DEPARTAMENTO, ACTUALIZAR_TIPO_DEPARTAMENTO, ASIGNAR_TIPO_DEPARTAMENTO, REGISTRO_MONTO_AGUA y detalle en CALCULO_MORA_EXPENSAS probados.
US2.2: Estados de cuenta y saldos
CA	Estado	Nota
01-02 Departamento y propietario	Cumple	Probado (incluye ocupante actual).
03 Períodos, conceptos, montos	Cumple	montoBase, montoAgua, monto y concepto ("Expensa mensual Tipo B" y "Agua" si montoAgua > 0, sin m3) implementados y probados.
04 Pagos	Cumple	Probado (con pagador e historial de anulaciones).
05 Anticipos y su aplicación	Cumple	Anticipos, saldo disponible e imputación implementados.
06 Mora por obligación	Cumple	Probado.
07 Saldo actualizado	Cumple	Probado.
08 Estados	Cumple	"Moroso" y "Deuda Pendiente" consistentes con saldos.
09 Filtro por período y fechas	Cumple	Filtros `periodo`, `desde`, `hasta`, `estado` en backend y UI.
10 Historial cronológico	Cumple	Línea de tiempo unificada en `movimientos` con trazabilidad completa.
11 Sin movimientos	Cumple	Bandera `sinMovimientos` y empty state descriptivo en UI.
12 Totales consistentes	Cumple	Totales calculados con precisión sobre obligaciones, pagos vigentes y anticipos.

US1.3: Subsistema de auditoría y trazabilidad
CA	Endpoint(s)	Estado	Nota
01 Registro transversal	`registrarAuditoria`	Cumple	Eventos semánticos en transacciones críticas (incluyendo REGISTRO_MONTO_AGUA) (probado).
02 Consulta paginada y filtros	`GET /auditoria`	Cumple	Filtros por tabla, acción, usuario, registro, resultado, fechas y paginación {data, meta} (probado).
03 Detalle individual	`GET /auditoria/:id`	Cumple	Detalle con datosAnteriores y datosNuevos, 404 si no existe (probado).
04 Seguridad y enmascarado	`GET /auditoria`, `GET /auditoria/:id`	Cumple	Enmascara credenciales/tokens; RBAC Administrador y Directorio (403 Consulta, 401 sin token) (probado).
05 Inmutabilidad	API solo lectura	Cumple	Sin endpoints mutadores en la API (probado); pendiente trigger/REVOKE en base de datos.

---
## 9. Pendientes conocidos
- [Resuelto] Montos de agua manuales: El cálculo de agua se gestiona fuera del sistema y se registra mensualmente mediante monto manual por departamento en `montos_agua`; migración 004 (`database/migrations/004_montos_agua_manuales.sql`) aplicada e integrada. Las tablas `tarifas_agua` y `lecturas_agua` quedan sin uso en el sistema.
- [Resuelto] Quién pagó: `idPersonaPagador` obligatorio en pagos y correcciones implementado y probado; la columna `id_persona_pagador` en `edificio.pagos` fue creada formalmente en la BD compartida y versionada en `database/migrations/003_expensas_agua_sesiones_pagos.sql`.
- [Resuelto] Control de duplicados en expensas: la BD real ya cuenta con la restricción `UNIQUE (id_departamento, periodo)` y el backend maneja P2002 como 409 Conflict.
- (a) Base de datos de respaldo (Render): La instancia de base de datos en Render aún no cuenta con la ejecución de las migraciones `003_expensas_agua_sesiones_pagos.sql` y `004_montos_agua_manuales.sql`. Hasta que DevOps alinee el esquema del respaldo ejecutando dichas migraciones, la validación `checkFallbackSchema` del failover abortará cualquier intento de conmutación y responderá `503 Service Unavailable` indicando las tablas y columnas faltantes.
- (b) Sincronización y conciliación entre bases de datos: No existe replicación ni sincronización automática entre la base de datos principal y la de respaldo (son bases independientes). Toda operación realizada mientras el sistema se encuentre conmutado generará divergencia de datos y requerirá un proceso de conciliación manual por parte del equipo de operaciones antes o después de la restauración.
- (c) Bloqueo temporal por sesión única: Con la política de sesión única basada en base de datos (`edificio.sesiones`), si un usuario cierra el navegador o pestaña abruptamente sin hacer logout (`POST /auth/logout`), su registro permanecerá activo y no podrá volver a iniciar sesión durante un período de hasta 30 minutos de inactividad (`ultimo_acceso >= 30 min`), salvo que un Administrador realice un cierre forzado (`DELETE /api/v1/auth/sesiones/:idUsuario`).
- (d) Registros de auditoría generados por pruebas automatizadas: La tabla `edificio.auditoria` en la base de datos compartida contiene filas producidas durante la ejecución de pruebas y diagnósticos que no se pueden borrar a través de la API (los endpoints de auditoría son de solo lectura para preservar la inmutabilidad y trazabilidad).
- (e) Atributo `area_m2` en departamentos: Posible traslado o consolidación de la columna `area_m2` a otra tabla especializada o su gestión exclusiva a nivel de tipo de departamento, pendiente de evaluar y decidir con el equipo de DevOps.
- (f) Despliegue en contenedor Docker: Confirmar con el equipo de DevOps si el script de inicio `database/start.sh` (o el proceso de construcción del contenedor Docker) ejecuta formalmente las migraciones acumuladas al aprovisionar el contenedor o si continúa realizando únicamente el `IMPORT FOREIGN SCHEMA`.
- Pagos de expensa e ingresos: hoy un pago de expensa no genera un Ingreso en Movimientos (Pendiente).
- Anulación de anticipo ya aplicado: pendiente bloquear con `409 Conflict` (Parcial / Pendiente).
- [Resuelto] US2.2: filtros (`periodo`, `desde`, `hasta`, `estado`), línea de tiempo de `movimientos`, bandera `sinMovimientos` y ficha de `ocupanteActual` implementados y probados tanto en backend como en frontend.
- US2.3 y US2.4: criterios pendientes de recibir (Caja y Bancos, conciliación) (Pendiente).
- Montos provisionales: regla de mora (5 %, sin días de espera) y montos por tipo (300/350/400) pendientes de confirmar con el Scrum (Pendiente).
- Inmutabilidad de auditoría a nivel de base de datos: En el backend los endpoints son estrictamente de solo lectura (`GET /auditoria` y `GET /auditoria/:id`, sin rutas PUT/PATCH/DELETE). En la base de datos física PostgreSQL (`001_initial_schema.sql`), la tabla `edificio.auditoria` no cuenta con triggers de protección contra UPDATE o DELETE ni con REVOKE; se deja como recomendación técnica para DevOps implementar triggers o restringir permisos para garantizar inmutabilidad a nivel de motor.
- metodo_pago es texto libre; falta definir lista cerrada
- las migraciones 003 a 005 deben aplicarse en Render antes de desplegar (failover)

---
## 10. Respaldo de Conexión y Conmutación de Base de Datos (Failover)

### 10.1 Arquitectura del Cliente Prisma con BD Activa
El backend implementa un mecanismo de conmutación de conexión transparente y seguro gestionado por `DatabaseFailoverService` en coordinación con el cliente dinámico Prisma (`@edificio-xyz/database`):
- **Base de Datos Principal:** Apunta a la instancia primaria en la nube (`DATABASE_URL`).
- **Base de Datos de Respaldo:** Apunta a una instancia de contingencia independiente sin sincronización automática (`FALLBACK_DATABASE_URL`).
- **Estado Activo:** El cliente opera con un estado unificado (`activeDb: 'principal' | 'respaldo'`), delegando todas las consultas del ORM al cliente correspondiente.

### 10.2 Reglas Estrictas de Conmutación
1. **Disparadores Exclusivos de Conexión:**
   - La conmutación ocurre **ÚNICAMENTE** ante fallos de conexión de red o del motor de base de datos: códigos de error Prisma `P1001` (can't reach database server), `P1002` (timeout de conexión), `P1008` (operaciones expiradas), `P1017` (conexión cerrada por el servidor), y errores del sistema operativo `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET` o timeouts.
   - **NUNCA ante errores de negocio:** Violaciones de unicidad o restricciones de integridad (`P2002`, `P2003`, `P2025` y cualquier código `P2xxx`) y errores HTTP de validación/negocio (`400`, `401`, `403`, `404`, `409`, `422`) **NO** provocan conmutación ni alteran la BD activa.
2. **Reintento Inmediato:** Ante un fallo de conexión en la principal, el sistema ejecuta **un solo reintento** contra la base principal para descartar micro-cortes transitorios de red. Si el reintento responde, la operación continúa sin conmutar.
3. **Validación Previa del Esquema de Respaldo (`checkFallbackSchema`):**
   - Antes de conmutar, el servicio comprueba la conectividad básica (`SELECT 1`) y valida estrictamente en `information_schema` que la base de datos de respaldo contenga todas las tablas y columnas necesarias para operar:
     - **Tablas requeridas (10 tablas en el esquema `edificio`):** `usuarios`, `roles`, `departamentos`, `personas`, `expensas`, `pagos`, `sesiones`, `montos_agua`, `reglas_mora`, `tipos_departamento`.
     - **Columnas requeridas (4 columnas críticas/nuevas):** `tipos_departamento.activo`, `expensas.monto_base`, `expensas.monto_agua`, `pagos.id_persona_pagador`.
   - Si `FALLBACK_DATABASE_URL` no está configurada, es inalcanzable o carece de alguna de estas tablas o columnas, la conmutación se aborta inmediatamente para proteger la integridad operativa.
   - En este caso, el sistema responde un error HTTP `503 Service Unavailable` listando detalladamente en el mensaje legible y en la estructura JSON (`details: { missingTables: string[], missingColumns: string[] }`) la totalidad de tablas y columnas faltantes.
4. **Protección Contra Doble Escritura (Sin Reenvío de Operación Fallida):**
   - Para evitar duplicidad de transacciones críticas (como registros de pagos o aplicaciones de anticipos cuyo estado pudo quedar comprometido durante la interrupción), la petición en curso que detonó la caída **NUNCA** se reenvía automáticamente al respaldo.
   - Dicha petición responde de inmediato `503 Service Unavailable` con mensaje descriptivo, y el cliente conmuta de inmediato para que todas las peticiones posteriores utilicen la base de respaldo activa.
5. **Sin Regreso Automático:**
   - Una vez conmutado al respaldo, el sistema no regresa automáticamente a la principal para evitar oscilaciones (*flapping*). La restauración se realiza de forma manual y controlada por un Administrador.

### 10.3 Endpoints de Diagnóstico y Restauración

#### `GET /api/v1/health/db`
- **Roles autorizados:** `Administrador`.
- **Descripción:** Devuelve el estado actual de la base de datos activa, la fecha del último cambio y el motivo de la conmutación.
- **Respuesta 200 OK:**
```json
{
  "status": "ok",
  "bdActiva": "principal",
  "activeDb": "principal",
  "ultimoCambio": {
    "fecha": "2026-10-15T18:30:00.000Z",
    "motivo": "Inicialización del servicio de base de datos"
  },
  "fechaUltimoCambio": "2026-10-15T18:30:00.000Z",
  "motivoUltimoCambio": "Inicialización del servicio de base de datos"
}
```
- **Errores:** `401 Unauthorized` si no hay token; `403 Forbidden` para roles no Administradores (Directorio, Consulta, etc.).

#### `POST /api/v1/health/db/principal`
- **Roles autorizados:** `Administrador`.
- **Descripción:** Comprueba la conectividad con la base de datos principal (`SELECT 1`). Si la prueba es exitosa, restaura la principal como la base activa y registra el log del evento. Si la principal sigue caída, rechaza la operación con `503 Service Unavailable` y mantiene el cliente en el respaldo.
- **Respuesta 200 OK (Comprobada y Restaurada):**
```json
{
  "status": "ok",
  "message": "Base de datos principal comprobada y restaurada como activa.",
  "bdActiva": "principal",
  "activeDb": "principal",
  "ultimoCambio": {
    "fecha": "2026-10-15T19:45:00.000Z",
    "motivo": "Restauración manual a la base de datos principal solicitada por Administrador"
  }
}
```
- **Respuesta 503 Service Unavailable (Principal Inalcanzable):**
```json
{
  "error": "Service Unavailable",
  "message": "La base de datos principal no está disponible o no respondió a la prueba de conectividad."
}
```

### 10.4 Advertencias Críticas de Operación y Conciliación

> [!WARNING]
> **Divergencia de Datos y Conciliación Requerida:**
> Al conmutar al respaldo, ambas bases de datos divergen operativamente. Todas las operaciones realizadas en el respaldo (pagos, lecturas de agua, generación de expensas, registros de auditoría) no se sincronizan automáticamente con la base de datos principal.
> **Procedimiento de Conciliación Requerido:** Antes de reanudar el uso de la principal mediante `POST /api/v1/health/db/principal` o inmediatamente después, el equipo de administración y DevOps debe ejecutar un proceso de conciliación y sincronización de datos entre ambas bases para evitar pérdidas de información financiera.

> [!IMPORTANT]
> **Invalidez de Sesiones Activas (Tabla `sesiones`):**
> La tabla `edificio.sesiones` que respalda el mecanismo de sesión única e identificación de sesión (`sid`) almacena los estados de sesión emitidos en la base principal. Al conmutar al respaldo:
> 1. Las sesiones activas previas no existen en la base de respaldo (o la tabla carece de los registros vigentes).
> 2. Por diseño del middleware de autenticación, las peticiones autenticadas subsiguientes de los usuarios recibirán un error `401 Unauthorized` con el mensaje: *"Sesión inválida o cerrada. Vuelva a iniciar sesión."*
> 3. Los usuarios deben volver a ingresar sus credenciales para generar una nueva sesión válida en la base de datos actualmente activa.

### 10.5 Dependencia de Internos de Prisma (`requestTransaction`), Fijación de Versión y Regresión

- **Dependencia de internos del runtime de Prisma Client:**
  Para habilitar la conmutación dinámica transparente sin interferir con las transacciones por lotes (`prisma.$transaction([ ... ])`), el Proxy dinámico de `@edificio-xyz/database` envuelve las operaciones de modelo mediante `wrapPrismaPromise`. Dicho envoltorio preserva obligatoriamente el tag `[Symbol.toStringTag] === 'PrismaPromise'` y delega las llamadas a las propiedades y funciones internas del motor de Prisma, específicamente `.requestTransaction`.
- **Fijación estricta de la versión de Prisma:**
  Dado que la preservación de operaciones transaccionales en lote depende directamente de estructuras no públicas del runtime de Prisma (`requestTransaction` y el duck-typing de `Symbol.toStringTag`), **la versión de Prisma (`@prisma/client` y `prisma`, actualmente `v6.19.3`) debe mantenerse estrictamente fija**. No deben aplicarse actualizaciones mayores o intermedias sin antes validar rigurosamente la compatibilidad del Proxy contra estos métodos internos.
- **Detección temprana con pruebas de regresión:**
  La suite automatizada `backend/tests/database_failover.test.ts` incorpora pruebas de regresión dedicadas para ambas variantes de transacciones (`$transaction` por array de promesas y `$transaction` con callback interactivo). Estas pruebas aseguran que ante cualquier modificación en las dependencias o en el cliente Prisma, cualquier ruptura de compatibilidad interna sea detectada de forma inmediata.

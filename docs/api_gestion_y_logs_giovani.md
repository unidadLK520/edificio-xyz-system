API de Gestión y Logs: Edificio XYZ (Giovani, Backend Financiero)
Roles visibles del sistema: Administrador, Directorio, Consulta.
Base de rutas: `/api/v1`. Autenticación: `Authorization: Bearer <token>`.
---
## 0. Contratos en cambio (leer antes de integrar)
Esta sección avisa a Frontend y QA qué está vigente y qué cambiará según el requerimiento del ingeniero (expensa fija por tipo A/B/C).
Ya vigente (implementado y probado en pg-test):
- `generar-masivo`: el monto sale del tipo del departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400). Se eliminó la fórmula por área y el filtro por estado "Inactivo". Los departamentos sin tipo van a `excepciones[]` con motivo claro. Omite duplicados y aplica FIFO de anticipos disponibles. `montoBase` y `excluirDepartamentos` se aceptan solo por compatibilidad hacia atrás. Cada expensa conserva su monto al emitirse.
- `GET/PUT /expensas/montos-tipo` (Administrador, Directorio): lee y actualiza `tipos_departamento.monto_expensa`. Valida monto > 0. Auditoría `CONFIGURAR_MONTO_EXPENSA` con `datosAnteriores` y `datosNuevos`. Modificar el monto no altera expensas ya emitidas.
- `POST /expensas/:id/pagos` (directo y anticipo) y `PATCH /expensas/pagos/:idPago/corregir`: `idPersonaPagador` es estrictamente obligatorio (número entero positivo y validación de existencia en la tabla `personas`; responde `422` si falta o no existe).
- `POST /expensas/:id/pagos` y `PATCH /expensas/pagos/:idPago/corregir`: devuelven `422` si `montoPagado <= 0`, si la expensa ya está Pagada o si el monto excede el saldo.
- `POST /expensas`: devuelve `409` si ya existe expensa del mismo departamento y período.
- `GET /expensas` y `GET /expensas/:id`: incluyen el campo `vencida`; el listado acepta `?vencida=true`.
- `calcular-mora`: la mora se calcula sobre el capital pendiente (monto − pagos directos − anticipos aplicados). Antes ignoraba los anticipos.
- `GET/POST /expensas/reglas-mora`: mora configurable (tasa y días de gracia). Ya no existe el fallback fijo al 5 %.
- Cron de mora (apagado por defecto, timezone America/La_Paz).
- Historial de unidades: derivado de `ocupantes_departamento` (departamentos) y de `auditoria` (parqueos y bauleras), sin modelo físico `historial_asignacion_unidades`. Asignaciones y liberaciones atómicas en `$transaction`.
- `POST /unidades` y `PUT /unidades/Departamento/:id` aceptan `idTipo` opcional con validación de existencia en `tipos_departamento` (422 si no existe). `GET /unidades` devuelve `tipo` y `monto`.
Por implementar (cambiará, no construir sobre lo anterior):
- `GET /expensas/estado-cuenta/:idDepartamento`: se agregarán filtros `periodo`, `desde`, `hasta`, `concepto`, `movimientos`, `sinMovimientos`, pagador y ocupante actual.
- Emisión y lectura de expensas y estado de cuenta para rol Consulta: queda como "Pendiente" según el código actual y la matriz RBAC.
Fuera del sistema (según el ingeniero): gastos comunes como base de cálculo, servicios (agua variable, luz, gas), monto y contratos de alquiler. El registro de inquilinos y el historial de ocupantes sí permanece.
---
## 1. Módulo de Autenticación, Control de Acceso y Sesiones
Ubicación en el código: `backend/src/modules/auth/`
Prefijo de ruta: `/api/v1/auth`
1.1 Iniciar Sesión (Login)
Método y Ruta: `POST /api/v1/auth/login`
Propósito: Autentica con correo y contraseña (bcrypt). Protección contra fuerza bruta: máximo 3 intentos; al 3.º se bloquea la cuenta 10 minutos. Genera el JWT con rol y expiración. Audita `LOGIN_EXITOSO`, `LOGIN_FALLIDO` o `USUARIO_BLOQUEADO`.
Rol requerido: Público.
Request:
```json
{ "correo": "admin@edificioxyz.com", "password": "********" }
```
Respuesta 200:
```json
{
  "success": true,
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
`401`: `{ "error": "Unauthorized", "message": "Credenciales inválidas. Le quedan 2 intentos antes del bloqueo temporal." }`
`423`: `{ "error": "Locked", "message": "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intente nuevamente después de 2026-09-27T21:45:00.000Z." }`
1.2 Cerrar Sesión (Logout)
Método y Ruta: `POST /api/v1/auth/logout`
Propósito: Invalida la sesión en el cliente y audita `LOGOUT` con IP y metadatos.
Rol requerido: Autenticado.
Respuesta 200: `{ "success": true, "message": "Sesión cerrada correctamente" }`
1.3 Consultar Sesión Actual (Me)
Método y Ruta: `GET /api/v1/auth/me`
Propósito: Verifica el JWT, que el usuario siga activo y la expiración por inactividad (30 minutos). Devuelve perfil y rol.
Rol requerido: Autenticado (Administrador, Directorio, Consulta).
Respuesta 200:
```json
{
  "authenticated": true,
  "usuario": {
    "idUsuario": 1,
    "nombreUsuario": "admin",
    "correo": "admin@edificioxyz.com",
    "activo": true,
    "fechaCreacion": "2026-09-07T02:47:37.990Z",
    "ultimoAcceso": "2026-09-27T21:32:43.630Z",
    "rol": { "idRol": 1, "nombre": "Administrador", "descripcion": "Control total del sistema" }
  }
}
```
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
## 4. Módulo de Expensas, Pagos y Mora (US2.1 / US2.2, HU04)
Ciclo de vida de las obligaciones de expensas: generación mensual, pagos, anticipos con aplicación FIFO, mora configurable, estado de cuenta y corrección o anulación de pagos con recálculo y auditoría.
Ubicación: `backend/src/modules/expensas/` y `backend/src/routes/expensas.routes.ts` · Prefijo: `/api/v1/expensas`
4.1 Generación masiva de expensas (CA01-CA04)
`POST /api/v1/expensas/generar-masivo` · Roles: Administrador, Directorio.
Genera en una transacción las expensas del período para los departamentos aplicables, tomando el monto fijo de `tipos_departamento.monto_expensa` según el tipo configurado de cada unidad (Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400).
- Se eliminó definitivamente el cálculo por área (`montoBase * areaM2 / 100`) y el filtro por estado "Inactivo". El monto sale directo del tipo asignado al departamento.
- Los departamentos sin tipo asignado en `tipos_departamento` se omiten de la emisión y se derivan al arreglo de `excepciones[]` con motivo claro: `"El departamento no tiene un tipo asignado en tipos_departamento"`.
- Omite los departamentos que ya cuentan con expensa generada para dicho período (motivo: `"Expensa ya fue generada previamente para este período"`).
- Aplica de inmediato los anticipos disponibles en orden FIFO dentro de la misma transacción.
- Los parámetros `montoBase` y `excluirDepartamentos` se aceptan solo por compatibilidad hacia atrás.
- Cada expensa conserva su monto al emitirse de forma inmutable. Audita `GENERACION_MASIVA_EXPENSAS`.
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
  "excepciones": [
    { "idDepartamento": 1, "numero": "101", "motivo": "Expensa ya fue generada previamente para este período" },
    { "idDepartamento": 8, "numero": "302", "motivo": "El departamento no tiene un tipo asignado en tipos_departamento" }
  ]
}
```
4.2 Cálculo de mora (CA10, CA12)
`POST /api/v1/expensas/calcular-mora` · Roles: Administrador, Directorio.
Evalúa expensas vencidas (más allá de `fechaVencimiento + diasGracia`) con saldo pendiente. Calcula la mora sobre el capital pendiente, actualiza `montoMora`, `saldoPendiente` y el estado `Moroso`. Audita `CALCULO_MORA_EXPENSAS`. Tasa: la de la expensa si es > 0; si no, la regla activa; si no hay ninguna, error explícito.
Request: vacío.
```json
{ "message": "Se aplicó el recargo de mora a 3 expensas vencidas", "actualizadasCount": 3 }
```
4.3 Listado paginado (CA11)
`GET /api/v1/expensas` · Roles: Administrador, Directorio (verificar contra el código si Consulta tiene lectura).
Query: `estado` (Pendiente, Parcial, Pagado, Moroso, Todos), `idDepartamento`, `periodo` (YYYY-MM-DD), `vencida` (`true`), `page` (1), `limit` (50).
Cada expensa incluye el campo aditivo `vencida` (`fechaVencimiento < ahora && saldoPendiente > 0`).
```json
{
  "data": [
    {
      "idExpensa": 1, "idDepartamento": 1, "periodo": "2026-10-01T00:00:00.000Z",
      "monto": 552.5, "montoMora": 0, "saldoPendiente": 0, "tasaInteresMora": 5,
      "fechaVencimiento": "2026-10-15T00:00:00.000Z", "estado": "Pagado", "vencida": false,
      "departamento": { "numero": "101", "piso": 1, "propietario": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Mendoza Rojas", "ciNit": "4829103 CBBA", "telefono": "+591 71234567" } },
      "pagos": [{ "idPago": 10, "montoPagado": 552.5, "fechaPago": "2026-10-05T14:30:00.000Z", "anulado": false }],
      "_count": { "pagos": 1 }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```
4.4 Detalle de expensa
`GET /api/v1/expensas/:id` · Roles: Administrador, Directorio (verificar Consulta).
Incluye departamento, titular, pagos directos, `aplicacionesAnticipos` y `vencida`.
```json
{
  "idExpensa": 1, "idDepartamento": 1, "periodo": "2026-10-01T00:00:00.000Z",
  "monto": 552.5, "montoMora": 0, "saldoPendiente": 0, "tasaInteresMora": 5,
  "fechaVencimiento": "2026-10-15T00:00:00.000Z", "estado": "Pagado", "vencida": false,
  "departamento": { "numero": "101", "propietario": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" } },
  "pagos": [{ "idPago": 10, "montoPagado": 552.5, "metodoPago": "Transferencia", "fechaPago": "2026-10-05T14:30:00.000Z", "anulado": false }],
  "aplicacionesAnticipos": []
}
```
4.5 Creación individual (CA04)
`POST /api/v1/expensas` · Roles: Administrador, Directorio.
Emite una expensa y aplica en la misma transacción los anticipos disponibles (FIFO). Audita `CREAR_EXPENSA`.
Si ya existe expensa del departamento en el período: `409 Conflict` ("Ya existe una expensa registrada para el departamento en el período YYYY-MM").
```json
{ "idDepartamento": 1, "periodo": "2026-11-01", "monto": 550.0, "tasaInteresMora": 5, "fechaVencimiento": "2026-11-15" }
```
Respuesta 201:
```json
{ "idExpensa": 14, "idDepartamento": 1, "periodo": "2026-11-01T00:00:00.000Z", "monto": 550.0, "montoMora": 0, "saldoPendiente": 550.0, "tasaInteresMora": 5, "fechaVencimiento": "2026-11-15T00:00:00.000Z", "estado": "Pendiente" }
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
`GET /api/v1/expensas/estado-cuenta/:idDepartamento` · Roles: Administrador, Directorio (decisión pendiente: añadir Consulta, lectura).
Resumen financiero cronológico: obligaciones, pagos vigentes, saldo pendiente, anticipos totales y disponibles. Cada expensa incluye `capitalPendiente`.
```json
{
  "departamento": { "idDepartamento": 1, "numero": "101", "piso": 1, "propietario": { "nombres": "Carlos", "apellidos": "Mendoza Rojas" } },
  "resumen": { "totalObligaciones": 1102.5, "totalPagado": 852.5, "saldoPendienteTotal": 250.0, "totalAnticipos": 1000.0, "totalAnticiposDisponibles": 750.0, "estadoGlobal": "Deuda Pendiente" },
  "expensas": [], "pagos": [], "anticipos": [], "anticiposDisponibles": []
}
```
> **Por implementar:** filtros `periodo`/`desde`/`hasta`, `concepto`, `movimientos` (línea de tiempo), `sinMovimientos`, pagador y ocupante actual.
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
Aplica solo si `hoy > fechaVencimiento + diasGracia`.
`montoMora = capital × tasa / 100` (único porcentaje, sin recargo periódico).
`saldoPendiente = capital + montoMora`.
Estado: `Moroso` si está vencida y el saldo > 0; `Pagado` si el saldo es 0.
Tasa: la de la expensa si es > 0; si no, la de la regla activa; si no hay ninguna, error explícito (sin valor por defecto silencioso).
FIFO de anticipos: al crear una expensa se consumen los anticipos activos (`idExpensa` nulo, `esAnticipado`, no anulados) ordenados por `fechaPago` e `idPago` ascendentes, hasta cubrir el saldo o agotarlos. Estado resultante: `Pagado` si el saldo es 0, `Parcial` si bajó, `Pendiente` si no se aplicó nada.
Monto de expensa: el monto es fijo y sale directamente del tipo de departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400). No hay cálculo por área ni factores de superficie. Cada expensa conserva su monto original emitido de forma inmutable.
Recálculo dinámico y efecto de pagos posteriores: la mora se recalcula en cada ejecución sobre el capital vivo; un pago posterior reduce o elimina la mora ya calculada.
Ejemplo (550 / 300): expensa de Bs 550, tasa 5 %. Al vencer sin pagos, mora = 27.50 (saldo 577.50). Se aplican 250 (pago o anticipo): capital 300. La siguiente ejecución da mora = 15.00 (saldo 315.00). Si se cubren los 550, la mora pasa a 0.
Caso del bug corregido: expensa 550 con anticipo aplicado de 250; antes la mora se calculaba sobre 550 (27.50, saldo 577.50); ahora sobre 300 (15.00, saldo 315.00).
Idempotencia: ejecutar el cálculo varias veces sin cambios intermedios da el mismo resultado, porque sobrescribe `montoMora` sobre una base limpia. Si entre ejecuciones hubo pagos o cambió la regla, el resultado cambia.
`interesPagado`: se almacena de forma informativa; no amortiza mora, ni saldo, ni capital.
Ejemplo de independencia de mora por período (febrero y marzo): un mismo departamento con dos expensas vencidas (febrero por Bs 300 y marzo por Bs 300) genera un 5 % de mora independiente en cada una (Bs 15 de mora en febrero y Bs 15 en marzo, resultando en saldos de Bs 315 en cada período). La mora no crece acumulativamente con el paso de los meses ni se calcula sobre la mora de otros períodos. El endpoint `/morosos` consolida ambas obligaciones en `totalDeuda = Bs 630.00`.
4.13 Configuración de mora (CA09)
`GET /api/v1/expensas/reglas-mora` · Roles: Administrador, Directorio. Devuelve la regla activa y el historial.
```json
{
  "activa": { "idRegla": 1, "tasaInteres": "5", "diasGracia": 0, "activa": true, "fechaCreacion": "2026-10-05T01:08:16.728Z", "idUsuarioCreacion": null, "usuarioCreacion": null },
  "historial": [{ "idRegla": 1, "tasaInteres": "5", "diasGracia": 0, "activa": true, "fechaCreacion": "2026-10-05T01:08:16.728Z", "idUsuarioCreacion": null, "usuarioCreacion": null }]
}
```
`POST /api/v1/expensas/reglas-mora` · Roles: Administrador, Directorio.
Crea y activa una regla; desactiva la anterior en la misma transacción (una sola activa). Valida `tasaInteres` entre 0 y 100 y `diasGracia >= 0`. Audita `CONFIGURAR_REGLA_MORA`.
```json
{ "tasaInteres": 6, "diasGracia": 2 }
```
Errores: `400/422` por valores fuera de rango; `401` sin token; `403` sin permiso.
> Valores iniciales (5 %, 0 días) son provisionales, pendientes de definición por el Scrum Master.
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
Control de duplicados e integridad física: La BD real ya cuenta con la restricción `UNIQUE (id_departamento, periodo)`. El control de duplicados se realiza tanto por consulta previa como por restricción física de motor (el error de unicidad `P2002` se mapea y responde como `409 Conflict` en endpoints individuales y masivos, probado en pg-test).

4.16 Montos de expensa por tipo de departamento
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
```json
{
  "data": [
    {
      "idMovimiento": 12, "tipo": "Egreso", "idCategoria": 1, "monto": 1200.0,
      "descripcion": "Reparación y mantenimiento del ascensor principal", "fecha": "2026-10-04T15:00:00.000Z",
      "comprobanteUrl": "https://storage.edificioxyz.com/facturas/fac-9912.pdf", "anulado": false,
      "categoria": { "idCategoria": 1, "nombre": "Mantenimiento y Reparaciones", "tipo": "Egreso" },
      "usuarioRegistro": { "idUsuario": 1, "nombreUsuario": "admin" }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```
5.4 Detalle de movimiento
`GET /api/v1/movimientos/:id` · Roles: Administrador, Directorio.
Incluye categoría, usuario, `movimientosBancarios` y `pagosEmpleados`.
5.5 Registrar movimiento
`POST /api/v1/movimientos` · Rol: Administrador. Valida tipo, monto positivo y categoría existente. Audita `CREAR_MOVIMIENTO`.
```json
{ "tipo": "Ingreso", "idCategoria": 7, "monto": 800.0, "descripcion": "Alquiler del salón de eventos para reunión social", "fecha": "2026-10-05T18:00:00.000Z", "comprobanteUrl": "https://storage.edificioxyz.com/recibos/rec-salon-105.pdf" }
```
Respuesta 201: el movimiento creado con `anulado: false`, `idUsuarioRegistro`, `categoria` y `usuarioRegistro`.
5.6 Modificar movimiento
`PUT /api/v1/movimientos/:id` · Rol: Administrador. `409` si ya está anulado. Audita `MODIFICAR_MOVIMIENTO` (estado anterior y nuevo).
```json
{ "monto": 850.0, "descripcion": "Alquiler de salón de eventos con extensión horaria" }
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
`GENERACION_MASIVA_EXPENSAS`	expensas	`POST /expensas/generar-masivo`	Emisión mensual masiva fija por tipo (período, generadasCount, excepcionesCount).
`CREAR_EXPENSA`	expensas	`POST /expensas`	Emisión individual de expensa.
`CALCULO_MORA_EXPENSAS`	expensas	`POST /expensas/calcular-mora` y cron	Cálculo de mora sobre capital pendiente (origen `MANUAL` o `SISTEMA_CRON`).
`REGISTRO_PAGO_EXPENSA`	pagos	`POST /expensas/:id/pagos`	Pago directo (monto, expensa, idPersonaPagador).
`REGISTRO_ANTICIPO`	pagos	`POST /expensas/:id/pagos` (anticipo)	Pago a favor sin expensa asignada (idPersonaPagador, esAnticipado).
`APLICACION_ANTICIPO_MANUAL`	aplicaciones_anticipos	`POST /expensas/:id/aplicar-anticipo/:idPago`	Consumo manual de anticipo.
`ANULACION_PAGO`	pagos	`DELETE /expensas/pagos/:idPago`	Anulación con motivo y reversión de saldo.
`CORRECCION_PAGO`	pagos	`PATCH /expensas/pagos/:idPago/corregir`	Corrección enlazada por idPagoOriginal con idPersonaPagador.
`CONFIGURAR_REGLA_MORA`	reglas_mora	`POST /expensas/reglas-mora`	Configuración de tasa y días de gracia.
`CREAR_MOVIMIENTO`	movimientos	`POST /movimientos`	Registro de ingreso/egreso.
`MODIFICAR_MOVIMIENTO`	movimientos	`PUT /movimientos/:id`	Modificación de movimiento con delta.
`ANULACION_MOVIMIENTO`	movimientos	`DELETE /movimientos/:id`	Anulación de movimiento con motivo.
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
  "datosNuevos": { "idRegla": 2, "tasaInteres": 6.0, "diasGracia": 2, "activa": true }
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
Movimientos	/movimientos/resumen	GET	✅	✅	❌
Movimientos	/movimientos	GET	✅	✅	❌
Movimientos	/movimientos/:id	GET	✅	✅	❌
Movimientos	/movimientos	POST	✅	❌	❌
Movimientos	/movimientos/:id	PUT	✅	❌	❌
Movimientos	/movimientos/:id	DELETE	✅	❌	❌
Auditoria	/auditoria	GET	✅	✅	❌
Auditoria	/auditoria/:id	GET	✅	✅	❌

* Pendiente de confirmar contra el código y con el Scrum si Consulta tendrá lectura de expensas y estado de cuenta (requisito mínimo del cliente: emisión de estados de cuenta).
---
## 8. Trazabilidad US ↔ Criterio ↔ Endpoint
US2.1: Generación y control de expensas
CA	Endpoint(s)	Estado	Nota
01 Generación	`generar-masivo`	Cumple	Monto fijo por tipo de departamento A/B/C (probado en pg-test).
02 Asociación a la unidad	`generar-masivo`, `POST /expensas`	Cumple	Asociación a departamento (probado en pg-test).
03 Unidades aplicables	`generar-masivo`	Cumple	Departamentos sin tipo van a excepciones[] con motivo claro (probado en pg-test).
04 Duplicados	`POST /expensas`, `generar-masivo`	Cumple	Omite duplicados en masivo y 409 en creación individual; respaldado por la restricción `UNIQUE (id_departamento, periodo)` de la BD real con error P2002 convertido a 409 (probado en pg-test).
05-07 Pagos (parcial/total)	`POST .../pagos`	Cumple	Validaciones 422 e idPersonaPagador obligatorio (probado en pg-test).
08 Anticipo	`POST .../pagos`, `aplicar-anticipo`	Cumple	FIFO automático y aplicación manual (probado en pg-test).
09 Configuración de mora	`reglas-mora`	Cumple	Regla activa e historial cronológico (probado en pg-test).
10 Mora automática	`calcular-mora`, cron	Cumple	Cálculo sobre capital pendiente y cron en background (probado en pg-test).
11 Vencidas	campo `vencida`, `?vencida=true`, `morosos`	Cumple	Detección aditiva por fecha y saldo (probado en pg-test).
12 Saldo actualizado	pagos, anulación, corrección	Cumple	Saldo actualizado con pagos y anticipos (probado en pg-test).
13 Corrección o cancelación	`DELETE`, `PATCH corregir`	Parcial	DELETE y PATCH corregir con idPersonaPagador probados en pg-test; pendiente anulación de anticipo ya aplicado.
14 Trazabilidad	auditoría	Cumple	Auditoría transversal, CONFIGURAR_MONTO_EXPENSA y detalle de expensas {idExpensa, moraAnterior, moraNueva, saldoAnterior, saldoNuevo} (máx 200, truncado:true) en CALCULO_MORA_EXPENSAS probados en pg-test.
US2.2: Estados de cuenta y saldos
CA	Estado	Nota
01-02 Departamento y propietario	Cumple	Probado en pg-test.
03 Períodos, conceptos, montos	Parcial	Falta `concepto`.
04 Pagos	Cumple	Probado en pg-test.
05 Anticipos y su aplicación	Parcial	Falta historial detallado de aplicaciones.
06 Mora por obligación	Cumple	Probado en pg-test.
07 Saldo actualizado	Cumple	Probado en pg-test.
08 Estados	Parcial	"Moroso" convive con `vencida`.
09 Filtro por período	Pendiente	
10 Historial cronológico	Pendiente	
11 Sin movimientos	Pendiente	
12 Totales consistentes	Parcial	Falta prueba automatizada de consistencia.

US1.3: Subsistema de auditoría y trazabilidad
CA	Endpoint(s)	Estado	Nota
01 Registro transversal	`registrarAuditoria`	Cumple	Eventos semánticos en transacciones críticas (probado en pg-test).
02 Consulta paginada y filtros	`GET /auditoria`	Cumple	Filtros por tabla, acción, usuario, registro, resultado, fechas y paginación {data, meta} (probado en pg-test).
03 Detalle individual	`GET /auditoria/:id`	Cumple	Detalle con datosAnteriores y datosNuevos, 404 si no existe (probado en pg-test).
04 Seguridad y enmascarado	`GET /auditoria`, `GET /auditoria/:id`	Cumple	Enmascara credenciales/tokens; RBAC Administrador y Directorio (403 Consulta, 401 sin token) (probado en pg-test).
05 Inmutabilidad	API solo lectura	Cumple	Sin endpoints mutadores en la API (probado en pg-test); pendiente trigger/REVOKE en base de datos.

---
## 9. Pendientes conocidos
- Quién pagó: `idPersonaPagador` obligatorio en pagos y correcciones implementado y probado; la columna `id_persona_pagador` en `edificio.pagos` fue creada formalmente en la BD compartida y versionada en `database/migrations/003_expensas_agua_sesiones_pagos.sql`.
- Control de duplicados en expensas: resuelto; la BD real ya cuenta con la restricción `UNIQUE (id_departamento, periodo)` y el backend maneja P2002 como 409 Conflict.
- Pagos de expensa e ingresos: hoy un pago de expensa no genera un Ingreso en Movimientos (Pendiente).
- Anulación de anticipo ya aplicado: pendiente bloquear con `409 Conflict` (Parcial / Pendiente).
- US2.2: filtros (`periodo`, `desde`, `hasta`), concepto, línea de tiempo y caso sin movimientos (Pendiente).
- US2.3 y US2.4: criterios pendientes de recibir (Caja y Bancos, conciliación) (Pendiente).
- Montos provisionales: regla de mora (5 %, 0 días) y montos por tipo (300/350/400) pendientes de confirmar con el Scrum (Pendiente).
- Inmutabilidad de auditoría a nivel de base de datos: En el backend los endpoints son estrictamente de solo lectura (`GET /auditoria` y `GET /auditoria/:id`, sin rutas PUT/PATCH/DELETE). En la base de datos física PostgreSQL (`001_initial_schema.sql`), la tabla `edificio.auditoria` no cuenta con triggers de protección contra UPDATE o DELETE ni con REVOKE; se deja como recomendación técnica para DevOps implementar triggers o restringir permisos para garantizar inmutabilidad a nivel de motor.

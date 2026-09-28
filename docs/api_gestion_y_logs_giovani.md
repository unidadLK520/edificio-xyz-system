
1. Módulo de Autenticación, Control de Acceso y Sesiones
  Ubicación en el código:** `backend/src/modules/auth/`
  Prefijo de ruta:** `/api/v1/auth`

  1.1 Iniciar Sesión (Login)
    Método y Ruta: `POST /api/v1/auth/login`
    Propósito: Autentica a un usuario mediante correo y contraseña hasheada (bcrypt). Incluye protección contra fuerza bruta con conteo de intentos fallidos (máximo 3 intentos; al 3er intento se bloquea la cuenta por 10 minutos) y genera el token JWT con claims de rol y expiración. Registra el evento en auditoría (`LOGIN_EXITOSO`, `LOGIN_FALLIDO` o `USUARIO_BLOQUEADO`).
    Rol requerido: `Público` (sin token previo).

   1.2 Cerrar Sesión (Logout)
    Método y Ruta: `POST /api/v1/auth/logout`
    Propósito: Invalida la sesión activa en el cliente y registra formalmente el evento de cierre de sesión en la tabla de auditoría con la IP de origen y metadatos del cliente.
    Rol requerido: `Público / Autenticado`.

  1.3 Consultar Sesión Actual (Me)
    Método y Ruta: `GET /api/v1/auth/me`
    Propósito: Verifica la validez del token JWT activo, comprueba si el usuario sigue activo en la base de datos y evalúa la política de expiración por inactividad de sesión (30 minutos sin solicitudes). Retorna los datos del perfil y roles asociados.
    Rol requerido: `Autenticado` (Cualquier rol válido: `Administrador`, `Directorio`, `Copropietario`, `Consulta`).



2. Módulo de Administración de Copropietarios y Personas 
  Ubicación en el código: `backend/src/modules/personas/`
  Prefijo de ruta: `/api/v1/personas`
  
  2.1 Listado y Búsqueda Paginada de Personas
    Método y Ruta: `GET /api/v1/personas`
    Propósito: Permite buscar y listar personas registradas con soporte para filtros por texto (nombre, apellido, CI/NIT, correo), paginación y ordenamiento. Incluye relaciones con departamentos propios y contratos de ocupación vigentes.
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  2.2 Obtener Detalle de Persona por ID
    Método y Ruta: `GET /api/v1/personas/:id`
    Propósito: Retorna la ficha técnica de una persona específica por su identificador primario, desglosando unidades en propiedad y ocupaciones activas.
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  2.3 Historial de Ocupaciones y Antecedentes de una Persona
    Método y Ruta: `GET /api/v1/personas/:id/historial`
    Propósito: Obtiene la cronología completa de todas las asignaciones históricas que ha tenido una persona en cualquier unidad del edificio (fechas de inicio y fin, tipo de relación, departamentos habitados).
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  2.4 Historial de Residentes de un Departamento
    Método y Ruta: `GET /api/v1/personas/departamentos/:idDepartamento/historial`
    Propósito: Muestra todos los copropietarios e inquilinos que han habitado una unidad específica a lo largo del tiempo, facilitando la auditoría de residentes.
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  2.5 Registrar Nueva Persona
    Método y Ruta: `POST /api/v1/personas`
    Propósito: Da de alta a una persona en el sistema con validación de unicidad de CI/NIT. Registra la acción en la tabla de auditoría con los datos nuevos.
    Rol requerido: `Administrador`, `Directorio`.

  2.6 Actualizar Datos de Persona
    Método y Ruta: `PUT /api/v1/personas/:id`
    Propósito: Modifica los datos personales o de contacto de una persona existente. Compara los datos anteriores con los nuevos y guarda un registro de auditoría con el delta de modificaciones.
    Rol requerido: `Administrador`, `Directorio`.

 2.7 Asignar Persona a Unidad (Ocupación / Titularidad)
    Método y Ruta: `POST /api/v1/personas/:id/unidades`
    Propósito: Asigna a una persona un departamento bajo el rol de `Propietario` o `Inquilino`. En caso de ser propietario, actualiza la titularidad del departamento; si es inquilino, actualiza el estado de la unidad a `Ocupado`. Ejecutado en transacción atómica con auditoría.
    Rol requerido: `Administrador`, `Directorio`.

  2.8 Finalizar Ocupación de Unidad
    Método y Ruta: `PATCH /api/v1/personas/ocupaciones/:idOcupacion/finalizar`
    Propósito: Da por concluido el contrato o estadía de un ocupante, marcando la `fechaFin` y re-evaluando automáticamente el estado del departamento (cambia a `Disponible` si no quedan más ocupantes activos).
    Rol requerido: `Administrador`, `Directorio`.




3. Módulo de Gestión de Unidades, Departamentos y Asignaciones 
  Ubicación en el código: `backend/src/routes/unidades.routes.ts`
  Prefijo de ruta: `/api/v1/unidades`

 3.1 Listado Unificado de Unidades (Inventario)
    Método y Ruta: `GET /api/v1/unidades`
    Propósito: Consolida en una sola API polimórfica la consulta de Departamentos, Parqueos y Bauleras. Permite filtrar por tipo de unidad, estado (`Disponible`, `Ocupado`, `Mantenimiento`, `EnAlquiler`) y búsqueda por texto o propietario.
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  3.2 Detalle Específico de Unidad con Historial de Antecedentes
    Método y Ruta: `GET /api/v1/unidades/:tipo/:id`
    Propósito: Retorna la información completa de una unidad específica (`tipo`: `Departamento`, `Parqueo` o `Baulera`) incluyendo historial de asignaciones pasadas, ocupantes vigentes y anexos vinculados.
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.

  3.3 Crear Unidad Física (Departamento / Parqueo / Baulera)
    Método y Ruta: `POST /api/v1/unidades`
    Propósito: Registra una nueva unidad verificando la no duplicidad del identificador alfanumérico (ej. "101", "P-01") según el tipo de unidad. Registra el evento en auditoría.
    Rol requerido: `Administrador`, `Directorio`.

 3.4 Editar Unidad Física
    Método y Ruta: `PUT /api/v1/unidades/:tipo/:id`
    Propósito: Modifica los atributos físicos o de estado de una unidad, validando que el nuevo número no colisione con unidades existentes. Guarda el delta de cambios en auditoría.
    Rol requerido: `Administrador`, `Directorio`.

  3.5 Asignación Atómica de Unidad (Vínculo Persona/Departamento)
    Método y Ruta: `POST /api/v1/unidades/asignaciones`
    Propósito: Vincula de manera atómica transaccional una unidad (parqueo, baulera o departamento) a una persona o a un departamento titular. Si se asigna un parqueo a un departamento, actualiza el estado de la unidad a `Ocupado` o `Asignado`, crea la entrada en `historial_asignacion_unidades` y emite el evento de auditoría en una sola transacción ACID.
    Rol requerido: `Administrador`, `Directorio`.

 3.6 Finalizar Asignación de Unidad
    Método y Ruta: `POST /api/v1/unidades/asignaciones/finalizar`
    Propósito: Desvincula la unidad liberándola (vuelve a estado `Disponible`), cierra la asignación activa con fecha fin en el historial y registra el log de auditoría.
    Rol requerido: `Administrador`, `Directorio`.



4. Subsistema Transversal de Logs y Auditoría del Sistema
  Ubicación en el código: `backend/src/modules/auditoria/`
  Componentes: `AuditoriaService`, `AuditoriaRepository`, `auditoria.types.ts`
  Tabla en Base de Datos: `edificio.auditoria`

  4.1 Estructura del Modelo de Datos de Auditoría
  Definido en el esquema de Prisma (`schema.prisma`):

|      Campo    |   Tipo   | Restricciones / Mapeo        | Descripción |
|`idAuditoria`  | `Int`    |`@id @default(autoincrement())`| Clave primaria secuencial única del evento. |
|`tablaAfectada`| `String` | `@db.VarChar(50)`            | Nombre de la entidad afectada (`usuarios`, `personas`, `unidades`, `expensas`, `pagos`). |
| `idRegistro`  |`String?` | `@db.VarChar(100)`           | ID de la entidad involucrada (ej. `"15"`, `"PAGO-77"`). |
| `accion`      |`String`  | `@db.VarChar(50)`            | Operación ejecutada (`LOGIN_EXITOSO`, `CREAR_PERSONA`, `ANULACION_PAGO`). |
| `fechaHora`   |`DateTime`| `@default(now()) @db.Timestamp(6)` | Marca temporal UTC del servidor en el momento de la mutación. |
| `idUsuario`   |`Int?`    | `@db.Integer` | Clave foránea al usuario autenticado que ejecutó la acción (`null` para fallos de login). |
| `resultado`   |`String?` | `@default("EXITO") @db.VarChar(30)` | Resultado del evento (`EXITO`, `CREDENCIALES_INVALIDAS`, `BLOQUEO_TEMPORAL`). |
| `datosAnteriores`| `Json?` | `@db.JsonB` | Snapshot del estado antes de la mutación (para updates y anulaciones). |
| `datosNuevos`    | `Json?` | `@db.JsonB` | Snapshot de los nuevos datos, metadatos de IP, user-agent o motivo. |


  4.2 Catálogo de Eventos Registrados por el Subsistema

| Código de Evento | Tabla Afectada | Disparador / Origen   | Datos Capturados en `datosNuevos` 
| `LOGIN_EXITOSO`  | `usuarios` | `POST /api/v1/auth/login` | Correo, Rol, Dirección IP, User-Agent. 
| `LOGIN_FALLIDO`  | `usuarios` | `POST /api/v1/auth/login` | Correo intentado, Motivo, Intentos acumulados, IP. 
|`USUARIO_BLOQUEADO`| `usuarios`| `Al 3er intento fallido`  | Correo, Duración de bloqueo (10 min), Fecha límite de desbloqueo. 
| `LOGOUT`         | `usuarios` | `POST /api/v1/auth/logout`| ID de usuario, IP, User-Agent. 
| `CREAR_PERSONA`  | `personas` | `POST /api/v1/personas`   | CI/NIT, Nombres, Apellidos, Teléfono, Correo. 
|`ACTUALIZAR_PERSONA`|`personas`| `PUT /api/v1/personas/:id`| Delta entre `datosAnteriores` y `datosNuevos`. 
| `ASIGNAR_UNIDAD` |`ocupantes_departamento`| `POST /api/v1/personas/:id/unidades`| ID de Persona, ID de Departamento, Tipo de Ocupante (`Propietario`/`Inquilino`). 
|`FINALIZAR_OCUPACION`|`ocupantes_departamento`| `PATCH /ocupaciones/:id/finalizar` | ID de Ocupación, Fecha de fin registrada. 
| `CREAR_UNIDAD`   |`departamentos` / `parqueos` / `bauleras`| `POST /api/v1/unidades` | Tipo de unidad, Número, Piso, Alícuota/Área. 
| `ACTUALIZAR_UNIDAD` | `departamentos` / `parqueos` / `bauleras` | `PUT /api/v1/unidades/:tipo/:id` | Atributos modificados y estado anterior.
| `ASIGNACION_UNIDAD_ATOMIC`| `historial_asignacion_unidades`| `POST /api/v1/unidades/asignaciones` | ID Unidad, ID Persona/Depto, Tipo de Relación, Notas. 
| `FINALIZAR_ASIGNACION_ATOMIC`| `historial_asignacion_unidades`| `POST /api/v1/unidades/asignaciones/finalizar` | ID Unidad, Fecha de cierre, Nuevo estado disponible. 

  4.3 Ejemplo de Estructura de un Registro de Log de Auditoría en BD
  Ejemplo 1: Intento Fallido con Bloqueo de Cuenta por Seguridad
  ```json
{
  "idAuditoria": 9017,
  "tablaAfectada": "usuarios",
  "idRegistro": "3",
  "accion": "USUARIO_BLOQUEADO",
  "fechaHora": "2026-09-27T19:40:12.180Z",
  "idUsuario": 3,
  "resultado": "BLOQUEO_TEMPORAL",
  "datosAnteriores": null,
  "datosNuevos": {
    "correo": "residente@edificioxyz.com",
    "intentos": 3,
    "bloqueadoHasta": "2026-09-27T19:50:12.180Z",
    "duracionMinutos": 10,
    "ip": "190.181.24.12",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
  }
}

Ejemplo 2: Actualización de Datos de Copropietario con Delta Histórico
json
{
  "idAuditoria": 9022,
  "tablaAfectada": "personas",
  "idRegistro": "2",
  "accion": "ACTUALIZAR_PERSONA",
  "fechaHora": "2026-09-27T19:42:05.412Z",
  "idUsuario": 1,
  "resultado": "EXITO",
  "datosAnteriores": {
    "telefono": "+591 79876543",
    "direccion": "Calle Sucre 456"
  },
  "datosNuevos": {
    "telefono": "+591 77112233",
    "direccion": "Av. América 890"
  }
}


Matriz de Control de Acceso por Roles (RBAC)

| Módulo / Recurso |   Endpoint                            | Método | Administrador | Directorio | Consulta | Copropietario 
| **Auth**         | `/auth/login`                         | `POST` | ✅           | ✅         | ✅       | ✅          
| **Auth**         |`/auth/logout`                         | `POST` | ✅           | ✅         | ✅       | ✅ 
| **Auth**         | `/auth/me`                            | `GET`  | ✅           | ✅         | ✅       | ✅ 
| **Personas**     | `/personas`                           | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Personas**     |`/personas/:id`                        | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Personas**     | `/personas/:id/historial`             | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Personas**     | `/personas`                           | `POST` | ✅           | ✅         |  ❌      | ❌
| **Personas**     |`/personas/:id`                        | `PUT`  | ✅           | ✅         | ❌       | ❌ 
| **Personas**     |`/personas/:id/unidades`               | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Personas**     | `/personas/ocupaciones/:id/finalizar` | `PATCH`| ✅           | ✅         | ❌       | ❌ 
| **Unidades**     | `/unidades`                           | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Unidades**     | `/unidades/:tipo/:id`                 | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Unidades**     | `/unidades`                           | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Unidades**     | `/unidades/:tipo/:id`                 | `PUT`  | ✅           | ✅         | ❌       | ❌ 
| **Unidades**     | `/unidades/asignaciones`              | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Unidades**     | `/unidades/asignaciones/finalizar`    | `POST` | ✅           | ✅         | ❌       | ❌ 

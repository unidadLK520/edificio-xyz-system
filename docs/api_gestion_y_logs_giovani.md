
# 0. Resumen Ejecutivo y Estado General del Sistema (US2.1 - VIGENTE)
- **Estado General:** VIGENTE y verificado en entorno de pruebas local `pg-test` (`localhost:5433/edificio_test`).
- **Política Financiera de Expensas Fijas:** La expensa es fija por tipo de departamento (`tipos_departamento.monto_expensa`: Tipo A = Bs 300, Tipo B = Bs 350, Tipo C = Bs 400). El monto sale del tipo y cubre de manera integral seguridad, limpieza, mantenimiento, energía y agua comunes, sin cálculo por área.
- **Inmutabilidad de Emisiones:** Cada expensa conserva de manera inmutable su monto al momento de ser emitida. Actualizaciones posteriores a `tipos_departamento.monto_expensa` no alteran expensas previamente generadas.
- **Regla del Pagador (RN10):** En `POST /api/v1/expensas/:id/pagos` (pagos directos y anticipos) y `PATCH /api/v1/expensas/pagos/:idPago/corregir`, el campo `idPersonaPagador` es estrictamente obligatorio, respondiendo con error `422 Unprocessable Entity` si está ausente o si la persona no existe.

---

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
    Propósito: Retorna la información completa de una unidad específica (`tipo`: `Departamento`, `Parqueo` o `Baulera`). Para Departamentos incluye `tipo`, `monto` del tipo configurado (`tipos_departamento`) y su `historialAsignaciones` derivado dinámicamente de `ocupantes_departamento`. Para Parqueos y Bauleras, su `historialAsignaciones` se deriva de los eventos registrados en el subsistema de `auditoria` de dicha unidad. Mantiene la misma estructura de respuesta homogénea (`idHistorial`, `tipoUnidad`, `idUnidad`, `idPersona`, `tipoRelacion`, `fechaInicio`, `fechaFin`, `notas`, `persona`, `departamento`).
    Rol requerido: `Administrador`, `Directorio`, `Consulta`.
    Ejemplo de Respuesta (HTTP 200):
    ```json
    {
      "unidad": {
        "idDepartamento": 1,
        "numero": "101",
        "piso": 1,
        "areaM2": 95.5,
        "estado": "Ocupado",
        "idTipo": 1,
        "tipo": "A",
        "monto": 300.0,
        "tipoUnidad": "Departamento",
        "propietario": {
          "idPersona": 1,
          "nombres": "Carlos",
          "apellidos": "Gómez"
        },
        "parqueos": [],
        "bauleras": []
      },
      "historialAsignaciones": [
        {
          "idHistorial": 10,
          "tipoUnidad": "Departamento",
          "idUnidad": 1,
          "numeroUnidad": "101",
          "idPersona": 1,
          "idDepartamento": 1,
          "tipoRelacion": "Propietario",
          "fechaInicio": "2026-03-01T00:00:00.000Z",
          "fechaFin": null,
          "notas": "Ocupación registrada como Propietario",
          "persona": { "idPersona": 1, "nombres": "Carlos", "apellidos": "Gómez" },
          "departamento": { "idDepartamento": 1, "numero": "101" }
        }
      ]
    }
    ```

  3.3 Crear Unidad Física (Departamento / Parqueo / Baulera)
    Método y Ruta: `POST /api/v1/unidades`
    Propósito: Registra una nueva unidad verificando la no duplicidad del identificador alfanumérico según el tipo de unidad. Para Departamentos, acepta opcionalmente `idTipo` (validando su existencia en `tipos_departamento`, respondiendo `422 Unprocessable Entity` si no existe). Registra el evento en auditoría (`tablaAfectada`: `departamentos`/`parqueos`/`bauleras`, `accion`: `CREATE`, `datosNuevos`).
    Rol requerido: `Administrador`, `Directorio`.
    Payload de Solicitud:
    ```json
    {
      "tipoUnidad": "Departamento",
      "numero": "102",
      "piso": 1,
      "areaM2": 92.0,
      "idTipo": 1
    }
    ```
    Respuesta Exitosa (HTTP 201):
    ```json
    {
      "message": "Unidad registrada exitosamente",
      "unidad": {
        "idDepartamento": 2,
        "numero": "102",
        "piso": 1,
        "areaM2": 92.0,
        "estado": "Disponible",
        "idTipo": 1,
        "tipo": "A",
        "monto": 300.0,
        "tipoUnidad": "Departamento"
      }
    }
    ```
    Respuesta de Error de Validación (HTTP 422 - idTipo inexistente):
    ```json
    {
      "error": "UNPROCESSABLE_ENTITY",
      "message": "El idTipo especificado no existe en tipos_departamento"
    }
    ```

 3.4 Editar Unidad Física
    Método y Ruta: `PUT /api/v1/unidades/:tipo/:id`
    Propósito: Modifica los atributos físicos o de estado de una unidad, validando que el nuevo número no colisione con unidades existentes. Para Departamentos, acepta `idTipo` opcional (con validación de existencia en `tipos_departamento`, respondiendo `422 Unprocessable Entity` en caso de no existir). Guarda el delta de cambios en auditoría con `datosAnteriores` y `datosNuevos`.
    Rol requerido: `Administrador`, `Directorio`.
    Payload de Solicitud:
    ```json
    {
      "idTipo": 2,
      "piso": 2
    }
    ```
    Respuesta Exitosa (HTTP 200):
    ```json
    {
      "message": "Unidad actualizada exitosamente",
      "unidad": {
        "idDepartamento": 2,
        "numero": "102",
        "piso": 2,
        "areaM2": 92.0,
        "estado": "Disponible",
        "idTipo": 2,
        "tipo": "B",
        "monto": 350.0,
        "tipoUnidad": "Departamento"
      }
    }
    ```

  3.5 Asignación Atómica de Unidad (Vínculo Persona/Departamento)
    Método y Ruta: `POST /api/v1/unidades/asignaciones`
    Propósito: Vincula de manera atómica transaccional una unidad a una persona o a un departamento titular mediante `$transaction`. En Parqueos y Bauleras actualiza exclusivamente `estado` (a `Asignado`), `id_departamento`, `id_persona` y `fecha_asignacion`. Registra el evento en auditoría con `datosAnteriores` y `datosNuevos` dentro de la transacción, prescindiendo del modelo físico `historial_asignacion_unidades`.
    Rol requerido: `Administrador`, `Directorio`.
    Payload de Solicitud:
    ```json
    {
      "tipoUnidad": "Parqueo",
      "idUnidad": 1,
      "idPersona": 1,
      "idDepartamento": 1,
      "tipoRelacion": "Asignado",
      "notas": "Asignación de parqueo principal"
    }
    ```
    Respuesta Exitosa (HTTP 200):
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

 3.6 Finalizar Asignación de Unidad
    Método y Ruta: `POST /api/v1/unidades/asignaciones/finalizar`
    Propósito: Concluye la asignación activa de una unidad liberándola de forma atómica en `$transaction`. En Parqueos y Bauleras actualiza `estado` a `Disponible` y limpia `id_departamento`, `id_persona` y `fecha_asignacion`. Para Departamentos finaliza los ocupantes activos en `ocupantes_departamento` y re-evalúa el estado. Emite el evento de auditoría (`FINALIZACION_ASIGNACION`) conservando la trazabilidad histórica sin requerir `historial_asignacion_unidades`.
    Rol requerido: `Administrador`, `Directorio`.
    Payload de Solicitud:
    ```json
    {
      "tipoUnidad": "Parqueo",
      "idUnidad": 1,
      "notas": "Liberación de parqueo"
    }
    ```
    Respuesta Exitosa (HTTP 200):
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



4. Subsistema Transversal de Logs y Auditoría del Sistema
  Ubicación en el código: `backend/src/modules/auditoria/`
  Componentes: `AuditoriaService`, `AuditoriaRepository`, `auditoria.types.ts`
  Tabla en Base de Datos: `edificio.auditoria`

  4.1 Estructura del Modelo de Datos de Auditoría
  Definido en el esquema de Prisma (`schema.prisma`):

|      Campo    |   Tipo   | Restricciones / Mapeo        | Descripción |
|`idAuditoria`  | `Int`    |`@id @default(autoincrement())`| Clave primaria secuencial única del evento. |
|`tablaAfectada`| `String` | `@db.VarChar(50)`            | Nombre de la entidad afectada (`usuarios`, `personas`, `unidades`, `tipos_departamento`, `expensas`, `pagos`). |
| `idRegistro`  |`String?` | `@db.VarChar(100)`           | ID de la entidad involucrada (ej. `"15"`, `"PAGO-77"`). |
| `accion`      |`String`  | `@db.VarChar(50)`            | Operación ejecutada (`LOGIN_EXITOSO`, `CREAR_PERSONA`, `CONFIGURAR_MONTO_EXPENSA`, `ANULACION_PAGO`). |
| `fechaHora`   |`DateTime`| `@default(now()) @db.Timestamp(6)` | Marca temporal UTC del servidor en el momento de la mutación. |
| `idUsuario`   |`Int?`    | `@db.Integer` | Clave foránea al usuario autenticado que ejecutó la acción (`null` para fallos de login). |
| `resultado`   |`String?` | `@default("EXITO") @db.VarChar(30)` | Resultado del evento (`EXITO`, `CREDENCIALES_INVALIDAS`, `BLOQUEO_TEMPORAL`). |
| `datosAnteriores`| `Json?` | `@db.JsonB` | Snapshot del estado antes de la mutación (para updates y anulaciones). |
| `datosNuevos`    | `Json?` | `@db.JsonB` | Snapshot de los nuevos datos, metadatos de IP, user-agent o motivo. |


  4.2 Catálogo de Eventos Registrados por el Subsistema

| Código de Evento | Tabla Afectada | Disparador / Origen   | Datos Capturados en `datosNuevos` 
| `LOGIN_EXITOSO`  | `usuarios` | `POST /api/v1/auth/login` | Correo, Rol, Dirección IP, User-Agent. 
| `LOGIN_FALLIDO`  | `usuarios` | `POST /api/v1/auth/login` | Correo intentado, Motivo, Intentos acumulados, IP. 
| `USUARIO_BLOQUEADO`| `usuarios`| `Al 3er intento fallido`  | Correo, Duración de bloqueo (10 min), Fecha límite de desbloqueo. 
| `LOGOUT`         | `usuarios` | `POST /api/v1/auth/logout`| ID de usuario, IP, User-Agent. 
| `CREAR_PERSONA`  | `personas` | `POST /api/v1/personas`   | CI/NIT, Nombres, Apellidos, Teléfono, Correo. 
| `ACTUALIZAR_PERSONA`|`personas`| `PUT /api/v1/personas/:id`| Delta entre `datosAnteriores` y `datosNuevos`. 
| `ASIGNAR_UNIDAD` |`ocupantes_departamento`| `POST /api/v1/personas/:id/unidades`| ID de Persona, ID de Departamento, Tipo de Ocupante (`Propietario`/`Inquilino`). 
| `FINALIZAR_OCUPACION`|`ocupantes_departamento`| `PATCH /ocupaciones/:id/finalizar` | ID de Ocupación, Fecha de fin registrada. 
| `CREAR_UNIDAD`   |`departamentos` / `parqueos` / `bauleras`| `POST /api/v1/unidades` | Tipo de unidad, Número, Piso, Área m² / Tipo asignado. 
| `ACTUALIZAR_UNIDAD` | `departamentos` / `parqueos` / `bauleras` | `PUT /api/v1/unidades/:tipo/:id` | Atributos modificados y estado anterior.
| `ASIGNACION_UNIDAD_ATOMIC`| `historial_asignacion_unidades`| `POST /api/v1/unidades/asignaciones` | ID Unidad, ID Persona/Depto, Tipo de Relación, Notas. 
| `FINALIZAR_ASIGNACION_ATOMIC`| `historial_asignacion_unidades`| `POST /api/v1/unidades/asignaciones/finalizar` | ID Unidad, Fecha de cierre, Nuevo estado disponible. 
| `CONFIGURAR_MONTO_EXPENSA`   | `tipos_departamento`          | `PUT /api/v1/expensas/montos-tipo`             | ID Tipo, Nombre, Monto nuevo vs. Monto anterior.
| `GENERACION_MASIVA_EXPENSAS` | `expensas`                    | `POST /api/v1/expensas/generar-masivo`         | Período, Conteo de generadas (monto fijo por tipo), Conteo de excepciones.
| `CONFIGURAR_REGLA_MORA`      | `reglas_mora`                 | `POST /api/v1/expensas/reglas-mora`            | ID Regla, Tasa de Interés (%), Días de Gracia, Activa, Usuario creador.
| `CALCULO_MORA_EXPENSAS`      | `expensas`                    | `POST /api/v1/expensas/calcular-mora` / Cron   | Cantidad de expensas actualizadas, Origen (`MANUAL` o `SISTEMA_CRON`), Ejecutado por.
| `CREAR_EXPENSA`              | `expensas`                    | `POST /api/v1/expensas`                        | ID Expensa, Monto, Periodo, Departamento, Saldo post-anticipos.
| `REGISTRO_ANTICIPO`          | `pagos`                       | `POST /api/v1/expensas/:id/pagos` (anticipo)   | ID Pago, Monto, Departamento, Pagador (`idPersonaPagador`), Método de pago.
| `REGISTRO_PAGO_EXPENSA`      | `pagos`                       | `POST /api/v1/expensas/:id/pagos`              | ID Pago, Monto, Expensa, Pagador (`idPersonaPagador`), Nuevo saldo.
| `CORRECCION_PAGO`            | `pagos`                       | `PATCH /api/v1/expensas/pagos/:id/corregir`    | ID Pago nuevo, ID Pago original anulado, Pagador (`idPersonaPagador`), Motivo, Saldo recalculado.
| `ANULACION_PAGO`             | `pagos`                       | `DELETE /api/v1/expensas/pagos/:id`            | ID Pago anulado, Motivo, Saldo recalculado de expensa.

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
```

Ejemplo 2: Actualización de Datos de Copropietario con Delta Histórico
```json
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
```

Ejemplo 3: Configuración de Nueva Regla de Mora (CA09)
```json
{
  "idAuditoria": 9030,
  "tablaAfectada": "reglas_mora",
  "idRegistro": "2",
  "accion": "CONFIGURAR_REGLA_MORA",
  "fechaHora": "2026-10-04T12:00:00.000Z",
  "idUsuario": 1,
  "resultado": "EXITO",
  "datosAnteriores": {
    "idRegla": 1,
    "tasaInteres": 5.0,
    "diasGracia": 0,
    "activa": true
  },
  "datosNuevos": {
    "idRegla": 2,
    "tasaInteres": 6.0,
    "diasGracia": 3,
    "activa": true
  }
}
```

  4.6 Auditoría y Reglas de Generación Masiva de Expensas (VIGENTE)
    - Método y Ruta: `POST /api/v1/expensas/generar-masivo`
    - Regla de Monto Fijo por Tipo: El monto de cada expensa se determina estrictamente a partir de `tipos_departamento.monto_expensa` del tipo configurado para la unidad. Se eliminó definitivamente el cálculo proporcional por área (`montoBase * areaM2 / 100`) y el filtro por estado `Inactivo`. El monto sale directamente del tipo configurado, sin cálculo por área.
    - Manejo de Departamentos sin Tipo: Todo departamento que no tenga un tipo asignado en `tipos_departamento` es omitido de la generación y derivado al arreglo de `excepciones[]` con motivo claro (`El departamento no tiene un tipo asignado en tipos_departamento`).
    - Exclusión de Duplicados: Si una expensa ya fue emitida para el departamento en dicho período, se omite y se registra en `excepciones[]` con motivo `Expensa ya fue generada previamente para este período`.
    - Aplicación Automática FIFO: Si el departamento cuenta con anticipos a favor disponibles, se aplican automáticamente en orden FIFO dentro de la misma transacción `$transaction`.
    - Parámetros de Compatibilidad: `montoBase` y `excluirDepartamentos` se conservan en la interfaz de entrada por compatibilidad hacia atrás.
    - Registro de Auditoría: Emite el evento `GENERACION_MASIVA_EXPENSAS` sobre la tabla `expensas` registrando `periodo`, `generadasCount` y `excepcionesCount`.
    - Rol requerido: `Administrador`, `Directorio`.

  4.11 Configuración y Auditoría de Montos de Expensa por Tipo (VIGENTE)
    - Métodos y Rutas:
      - `GET /api/v1/expensas/montos-tipo`: Obtiene la lista completa de tipos de departamento con su `idTipo`, `nombre` y `montoExpensa` configurado.
      - `PUT /api/v1/expensas/montos-tipo`: Actualiza el monto de expensa para uno o varios tipos (soporta objeto individual, array o colección `{ tipos: [...] }`).
    - Validación Financiera: Valida estrictamente que el monto sea mayor a 0 (`monto > 0`). Si el monto es menor o igual a 0 o inválido, responde `HTTP 400 Validation Error`.
    - Inmutabilidad de Expensas Emitidas: Cambiar el monto del tipo en `tipos_departamento` aplica exclusivamente a las nuevas expensas que se emitan a futuro; **bajo ninguna circunstancia altera las expensas ya emitidas**, las cuales conservan su monto original de forma inmutable.
    - Auditoría: Genera un evento `CONFIGURAR_MONTO_EXPENSA` sobre la tabla `tipos_departamento` con `idRegistro: String(idTipo)`, registrando `datosAnteriores` (montoExpensa previo) y `datosNuevos` (nuevo montoExpensa) con el `idUsuario` autenticado dentro de la transacción.
    - Rol requerido: `Administrador`, `Directorio`.

  4.12 Dinámica de Recálculo de Mora sobre Capital Pendiente y Efecto de Pagos Posteriores (VIGENTE)
    - Mecanismo de Recálculo: La mora se recalcula dinámicamente en cada ejecución del proceso (`POST /api/v1/expensas/calcular-mora` o job de cron) directamente sobre el capital pendiente actual de la expensa (`Capital Pendiente = Monto Base del Tipo - Pagos Directos Válidos - Anticipos Aplicados Válidos`).
    - Determinación del Monto Base: El monto base proviene exclusivamente del tipo de departamento (`tipos_departamento.monto_expensa`), cubriendo seguridad, limpieza, mantenimiento, energía y agua comunes. El monto sale directamente del tipo de departamento, sin cálculo por área.
    - Impacto de Pagos Posteriores: Dado que el cálculo evalúa el saldo vivo de capital al momento de la ejecución, cualquier pago registrado con posterioridad a la primera aplicación de mora reduce la base del cálculo o incluso elimina por completo la mora calculada si el capital queda saldado.
    - Ejemplo Práctico (550 / 300):
      1. Se emite una expensa con monto base de Bs 550 y tasa de interés por mora del 5%.
      2. Al vencer el plazo sin pagos registrados, la ejecución inicial de cálculo de mora determina una mora del 5% sobre Bs 550 = Bs 27.50 (Total adeudado = Bs 577.50).
      3. Posteriormente, el copropietario efectúa un pago parcial de Bs 250 (o se aplican anticipos por dicho valor), dejando un capital pendiente residual de Bs 300 (550 - 250).
      4. Al ejecutarse nuevamente el cálculo de mora, el sistema evalúa los Bs 300 de capital pendiente: la mora pasa a ser el 5% de Bs 300 = Bs 15.00 (en lugar de conservar los Bs 27.50 calculados inicialmente). Si el copropietario cubre los Bs 550 completos de capital, el recargo de mora se recalcula a Bs 0.00.
    - Uso del campo `interesPagado`:
      En la tabla `edificio.pagos` existe la columna `interesPagado`. Se aclara explícitamente que `interesPagado` **NO se utiliza en ningún cálculo operativo ni financiero del sistema actual**: no amortiza `montoMora`, no reduce `saldoPendiente` ni disminuye el capital pendiente. Se almacena exclusivamente con fines informativos y de registro histórico contable.
    - Decisiones de Negocio (VIGENTE):
      El comportamiento de recálculo dinámico sobre el capital vivo pendiente ha sido ratificado y queda como política financiera vigente del sistema.

5. Módulo de Expensas, Reglas de Mora y Tareas Programadas
  Ubicación en el código: `backend/src/modules/expensas/` y `backend/src/routes/expensas.routes.ts`
  Prefijo de ruta: `/api/v1/expensas`

  5.1 Consultar Reglas de Mora
    Método y Ruta: `GET /api/v1/expensas/reglas-mora`
    Propósito: Devuelve la regla de mora activa actual y el historial completo ordenado cronológicamente.
    Rol requerido: `Administrador`, `Directorio`.

  5.2 Configurar Nueva Regla de Mora
    Método y Ruta: `POST /api/v1/expensas/reglas-mora`
    Propósito: Define la tasa de interés por mora (%) y días de gracia. Desactiva atómicamente la regla anterior en transacción ACID y registra auditoría `CONFIGURAR_REGLA_MORA`.
    Rol requerido: `Administrador`, `Directorio`.

  5.3 Recálculo Idempotente de Mora sobre Capital Pendiente
    Método y Ruta: `POST /api/v1/expensas/calcular-mora`
    Propósito: Calcula y aplica el recargo de mora considerando la fórmula exacta: Capital Pendiente = Monto Base - Pagos Directos Válidos - Anticipos Aplicados Válidos. Respeta días de gracia y toma la tasa de la expensa o la regla activa. Registra auditoría `CALCULO_MORA_EXPENSAS`.
    Nota sobre Recálculo Dinámico: Ver detalles técnicos, ejemplo numérico (550/300), aclaración de `interesPagado` y decisiones abiertas en la sección `4.12`.
    Rol requerido: `Administrador`, `Directorio`.

  5.4 Tarea Programada de Mora Automática
    Tecnología: `node-cron`
    Configuración: `MORA_CRON` (default: `"0 1 * * *"`), `MORA_CRON_ENABLED` (`true` / `false`).
    Propósito: Ejecuta el mismo servicio `ejecutarCalculoMora` en segundo plano, auditando la operación con `idUsuario: null` y marca clara de ejecución por `sistema`.

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
| **Expensas**     | `/expensas/reglas-mora`               | `GET`  | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/reglas-mora`               | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/calcular-mora`             | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas`                           | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Expensas**     | `/expensas/:id`                       | `GET`  | ✅           | ✅         | ✅       | ❌ 
| **Expensas**     | `/expensas`                           | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/generar-masivo`            | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/montos-tipo`               | `GET`  | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/montos-tipo`               | `PUT`  | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/:id/pagos`                 | `POST` | ✅           | ✅         | ❌       | ❌ 
| **Expensas**     | `/expensas/pagos/:id/corregir`        | `PATCH`| ✅           | ✅         | ❌       | ❌ 

---

6. Subsistema de Pagos y Control de Personas Pagadoras (RN10 - VIGENTE)

  6.2 Regla de Negocio del Pagador Obligatorio (RN10)
    - Endpoints Afectados:
      - `POST /api/v1/expensas/:id/pagos` (pagos directos y anticipos mediante `/anticipo/pagos`)
      - `PATCH /api/v1/expensas/pagos/:idPago/corregir` (corrección atómica de pagos)
    - Obligatoriedad Estricta (HTTP 422): El campo `idPersonaPagador` es **estrictamente obligatorio**. Si no se envía en el cuerpo de la solicitud, o si el ID enviado no existe en la tabla `edificio.personas`, el servidor responde de manera inmediata con código `422 Unprocessable Entity` ("El idPersonaPagador es obligatorio y debe ser un número entero positivo" o "La persona pagadora especificada en idPersonaPagador no existe").
    - Persistencia en Base de Datos: Columna `edificio.pagos.id_persona_pagador` con clave foránea a `edificio.personas(id_persona) ON DELETE SET NULL`.
    - Payload de Solicitud Ejemplo (`POST /api/v1/expensas/:id/pagos`):
    ```json
    {
      "idPersonaPagador": 1,
      "montoPagado": 350.00,
      "metodoPago": "Transferencia",
      "comprobanteUrl": "https://comprobantes.edificioxyz.com/recibo-101.pdf"
    }
    ```
    - Respuesta de Error por Pagador Ausente o Inexistente (HTTP 422):
    ```json
    {
      "error": "Unprocessable Entity",
      "message": "El idPersonaPagador es obligatorio y debe ser un número entero positivo"
    }
    ```

---

7. Reglas de Validación Financiera, Control de Integridad y Pagos (Bloque 3)
  Ubicación en el código: `backend/src/routes/expensas.routes.ts`

  7.1 Validación Estricta de Sobrepagos y Pagos Nulos (HTTP 422)
    - Endpoint: `POST /api/v1/expensas/:id/pagos`
    - Regla 1 (Monto Positivo): El campo `montoPagado` debe ser estrictamente mayor a 0. De ser menor o igual a 0, retorna `422 Unprocessable Entity` ("El monto pagado debe ser mayor a cero").
    - Regla 2 (Expensa No Pagada): No se admiten pagos sobre expensas cuyo `estado === 'Pagado'` o con `saldoPendiente <= 0`. Retorna `422 Unprocessable Entity` ("La expensa ya se encuentra totalmente pagada").
    - Regla 3 (Límite de Saldo Pendiente): `montoPagado` no puede exceder el `saldoPendiente` actual de la expensa. Si es superior, retorna `422 Unprocessable Entity` con el detalle de montos.

  7.2 Corrección Segura de Pagos con Saldo sin Pago Original (HTTP 422)
    - Endpoint: `PATCH /api/v1/expensas/pagos/:idPago/corregir`
    - Regla 1 (Monto Positivo): Valida `montoPagado > 0`, respondiendo `422 Unprocessable Entity` si es inválido.
    - Regla 2 (Evaluación contra Saldo sin el Pago Original): Dentro de la transacción atómica, el sistema anula el pago original y recalcula el saldo pendiente que tendría la expensa sin dicho pago (`saldoSinPagoOriginal`). El nuevo monto corregido no puede exceder este saldo disponible restaurado. En caso de superarlo, la transacción aborta con `422 Unprocessable Entity` ("El monto pagado no puede exceder el saldo pendiente").

  7.3 Detección Aditiva de Expensas Vencidas
    - Endpoints: `GET /api/v1/expensas` y `GET /api/v1/expensas/:id`
    - Campo Aditivo: Cada objeto de expensa incluye de forma aditiva y transparente el atributo booleano `vencida: boolean`, determinado mediante la regla: `fechaVencimiento < ahora && saldoPendiente > 0`.
    - Filtro por Query Param: En el listado `GET /api/v1/expensas`, el parámetro `?vencida=true` filtra dinámicamente en base de datos para devolver únicamente aquellas expensas cuyo plazo venció y mantienen deuda pendiente.

  7.4 Prevención de Expensas Duplicadas por Departamento y Período (HTTP 409)
    - Endpoint: `POST /api/v1/expensas`
    - Control de Duplicidad: Antes de la persistencia transaccional, se ejecuta una consulta previa con índice compuesto para verificar si ya existe una expensa para el par `(idDepartamento, periodoNormalizado)`. En caso afirmativo, responde de inmediato con `409 Conflict` ("Ya existe una expensa registrada para el departamento en el período YYYY-MM") sin crear registros huérfanos ni alterar la base de datos.

---

9. Trazabilidad de Requerimientos y Estado de Implementación (US2.1 - VIGENTE)

| Requerimiento | Descripción Técnica | Estado |
|---|---|---|
| **Expensas Fijas por Tipo de Departamento** | El monto sale directamente de `tipos_departamento.monto_expensa` (A: Bs 300, B: Bs 350, C: Bs 400), sin cálculo por área. Departamentos sin tipo van a excepciones con motivo claro. | **VIGENTE** |
| **Configuración de Montos por Tipo** | Endpoints `GET` y `PUT /api/v1/expensas/montos-tipo` con validación `monto > 0`, auditoría transaccional `CONFIGURAR_MONTO_EXPENSA` con `datosAnteriores` y `datosNuevos`, garantizando inmutabilidad sobre expensas históricas. | **VIGENTE** |
| **Persona Pagadora Obligatoria (RN10)** | Campo `idPersonaPagador` obligatorio en `POST /expensas/:id/pagos`, anticipos y `PATCH /pagos/:idPago/corregir` con respuesta `422 Unprocessable Entity` ante ausencia o inexistencia. | **VIGENTE** |
| **Reglas de Mora Dinámicas y Scheduler** | Tasa configurada en `reglas_mora`, cálculo sobre capital vivo pendiente y scheduler cron automatizado con zona horaria America/La_Paz. | **VIGENTE** |
| **Seed de Demostración Local Aislado** | Script `backend/scripts/seed_demo_local.ts` con guarda estricta que aborta si la conexión no es `localhost:5433/edificio_test`. | **VIGENTE** |



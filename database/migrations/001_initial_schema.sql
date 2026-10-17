CREATE SCHEMA IF NOT EXISTS edificio;
--
-- PostgreSQL database dump
--

\restrict JSpK8gNsgmkL8mD1M7xL2QmMKTPmCg6eh7Rfcyozpv1NENehsHUAD1LP8HyIbsI

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: edificio; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS edificio;


--
-- Name: fn_auditoria(); Type: FUNCTION; Schema: edificio; Owner: -
--

CREATE FUNCTION edificio.fn_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_anteriores)
        VALUES (TG_TABLE_NAME, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: aplicaciones_anticipos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.aplicaciones_anticipos (
    id_aplicacion integer NOT NULL,
    id_pago integer NOT NULL,
    id_expensa integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    fecha timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario_registro integer
);


--
-- Name: aplicaciones_anticipos_id_aplicacion_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.aplicaciones_anticipos_id_aplicacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aplicaciones_anticipos_id_aplicacion_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.aplicaciones_anticipos_id_aplicacion_seq OWNED BY edificio.aplicaciones_anticipos.id_aplicacion;


--
-- Name: auditoria; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.auditoria (
    id_auditoria bigint NOT NULL,
    tabla_afectada character varying(80) NOT NULL,
    id_registro text,
    accion character varying(50) NOT NULL,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    id_usuario integer,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    resultado character varying(50)
);


--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.auditoria_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.auditoria_id_auditoria_seq OWNED BY edificio.auditoria.id_auditoria;


--
-- Name: bauleras; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.bauleras (
    id_baulera integer NOT NULL,
    numero character varying(20) NOT NULL,
    id_departamento integer,
    estado character varying(20) DEFAULT 'Disponible'::character varying NOT NULL,
    fecha_asignacion timestamp(6) without time zone,
    id_persona integer
);


--
-- Name: bauleras_id_baulera_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.bauleras_id_baulera_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bauleras_id_baulera_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.bauleras_id_baulera_seq OWNED BY edificio.bauleras.id_baulera;


--
-- Name: caja; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.caja (
    id_movimiento_caja integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    tipo character varying(10) NOT NULL,
    concepto text,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    id_usuario_registro integer,
    CONSTRAINT caja_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Ingreso'::character varying, 'Egreso'::character varying])::text[])))
);


--
-- Name: caja_id_movimiento_caja_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.caja_id_movimiento_caja_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caja_id_movimiento_caja_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.caja_id_movimiento_caja_seq OWNED BY edificio.caja.id_movimiento_caja;


--
-- Name: categorias_movimiento; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.categorias_movimiento (
    id_categoria integer NOT NULL,
    nombre character varying(80) NOT NULL,
    tipo character varying(10) NOT NULL,
    CONSTRAINT categorias_movimiento_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Ingreso'::character varying, 'Egreso'::character varying])::text[])))
);


--
-- Name: categorias_movimiento_id_categoria_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.categorias_movimiento_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_movimiento_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.categorias_movimiento_id_categoria_seq OWNED BY edificio.categorias_movimiento.id_categoria;


--
-- Name: comunicados; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.comunicados (
    id_comunicado integer NOT NULL,
    titulo character varying(150) NOT NULL,
    contenido text NOT NULL,
    fecha_publicacion timestamp without time zone DEFAULT now() NOT NULL,
    canal_envio character varying(30),
    id_usuario_creador integer
);


--
-- Name: comunicados_envios; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.comunicados_envios (
    id_envio integer NOT NULL,
    id_comunicado integer NOT NULL,
    id_persona integer NOT NULL,
    fecha_envio timestamp without time zone,
    estado_envio character varying(20) DEFAULT 'Pendiente'::character varying
);


--
-- Name: comunicados_envios_id_envio_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.comunicados_envios_id_envio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicados_envios_id_envio_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.comunicados_envios_id_envio_seq OWNED BY edificio.comunicados_envios.id_envio;


--
-- Name: comunicados_id_comunicado_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.comunicados_id_comunicado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comunicados_id_comunicado_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.comunicados_id_comunicado_seq OWNED BY edificio.comunicados.id_comunicado;


--
-- Name: configuracion_global; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.configuracion_global (
    clave character varying(50) NOT NULL,
    valor text NOT NULL,
    descripcion text
);


--
-- Name: cuentas_bancarias; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.cuentas_bancarias (
    id_cuenta integer NOT NULL,
    banco character varying(80) NOT NULL,
    numero_cuenta character varying(50) NOT NULL,
    tipo_cuenta character varying(30),
    saldo_actual numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: cuentas_bancarias_id_cuenta_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.cuentas_bancarias_id_cuenta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuentas_bancarias_id_cuenta_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.cuentas_bancarias_id_cuenta_seq OWNED BY edificio.cuentas_bancarias.id_cuenta;


--
-- Name: departamentos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.departamentos (
    id_departamento integer NOT NULL,
    numero character varying(10) NOT NULL,
    piso integer,
    area_m2 numeric(8,2),
    id_propietario integer,
    estado character varying(20) DEFAULT 'Ocupado'::character varying NOT NULL,
    id_tipo integer
);


--
-- Name: departamentos_id_departamento_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.departamentos_id_departamento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departamentos_id_departamento_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.departamentos_id_departamento_seq OWNED BY edificio.departamentos.id_departamento;


--
-- Name: documentos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.documentos (
    id_documento integer NOT NULL,
    tipo_documento character varying(30) NOT NULL,
    nombre character varying(200) NOT NULL,
    url_archivo text NOT NULL,
    fecha_subida timestamp without time zone DEFAULT now() NOT NULL,
    id_usuario_subida integer,
    descripcion text
);


--
-- Name: documentos_id_documento_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.documentos_id_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.documentos_id_documento_seq OWNED BY edificio.documentos.id_documento;


--
-- Name: empleados; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.empleados (
    id_empleado integer NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    ci character varying(30) NOT NULL,
    cargo character varying(80),
    salario_base numeric(10,2) NOT NULL,
    fecha_ingreso date NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: empleados_id_empleado_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.empleados_id_empleado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empleados_id_empleado_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.empleados_id_empleado_seq OWNED BY edificio.empleados.id_empleado;


--
-- Name: expensas; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.expensas (
    id_expensa integer NOT NULL,
    id_departamento integer NOT NULL,
    periodo date NOT NULL,
    monto numeric(10,2) NOT NULL,
    tasa_interes_mora numeric(5,2) DEFAULT 0 NOT NULL,
    fecha_vencimiento date NOT NULL,
    saldo_pendiente numeric(10,2) NOT NULL,
    estado character varying(20) DEFAULT 'Pendiente'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    monto_mora numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: expensas_id_expensa_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.expensas_id_expensa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expensas_id_expensa_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.expensas_id_expensa_seq OWNED BY edificio.expensas.id_expensa;


--
-- Name: movimientos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.movimientos (
    id_movimiento integer NOT NULL,
    tipo character varying(10) NOT NULL,
    id_categoria integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    descripcion text,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    comprobante_url text,
    id_usuario_registro integer,
    anulado boolean DEFAULT false NOT NULL,
    fecha_anulacion timestamp(6) without time zone,
    id_usuario_anulacion integer,
    motivo_anulacion text,
    CONSTRAINT movimientos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Ingreso'::character varying, 'Egreso'::character varying])::text[])))
);


--
-- Name: movimientos_bancarios; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.movimientos_bancarios (
    id_mov_bancario integer NOT NULL,
    id_cuenta integer NOT NULL,
    id_movimiento integer,
    monto numeric(10,2) NOT NULL,
    tipo character varying(10) NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    conciliado boolean DEFAULT false NOT NULL,
    CONSTRAINT movimientos_bancarios_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['Deposito'::character varying, 'Retiro'::character varying])::text[])))
);


--
-- Name: movimientos_bancarios_id_mov_bancario_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.movimientos_bancarios_id_mov_bancario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_bancarios_id_mov_bancario_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.movimientos_bancarios_id_mov_bancario_seq OWNED BY edificio.movimientos_bancarios.id_mov_bancario;


--
-- Name: movimientos_id_movimiento_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.movimientos_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.movimientos_id_movimiento_seq OWNED BY edificio.movimientos.id_movimiento;


--
-- Name: ocupantes_departamento; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.ocupantes_departamento (
    id_ocupacion integer NOT NULL,
    id_departamento integer NOT NULL,
    id_persona integer NOT NULL,
    tipo_ocupante character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date
);


--
-- Name: ocupantes_departamento_id_ocupacion_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.ocupantes_departamento_id_ocupacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocupantes_departamento_id_ocupacion_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.ocupantes_departamento_id_ocupacion_seq OWNED BY edificio.ocupantes_departamento.id_ocupacion;


--
-- Name: pagos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.pagos (
    id_pago integer NOT NULL,
    id_expensa integer,
    id_departamento integer NOT NULL,
    monto_pagado numeric(10,2) NOT NULL,
    interes_pagado numeric(10,2) DEFAULT 0 NOT NULL,
    fecha_pago timestamp without time zone DEFAULT now() NOT NULL,
    metodo_pago character varying(30),
    es_anticipado boolean DEFAULT false NOT NULL,
    id_usuario_registro integer,
    comprobante_url text,
    id_cuenta integer,
    id_movimiento_caja integer,
    referencia_qr character varying(100),
    anulado boolean DEFAULT false NOT NULL,
    fecha_anulacion timestamp(6) without time zone,
    id_pago_original integer,
    id_usuario_anulacion integer,
    motivo_anulacion text,
    CONSTRAINT chk_pago_destino CHECK ((((id_cuenta IS NOT NULL) AND (id_movimiento_caja IS NULL)) OR ((id_cuenta IS NULL) AND (id_movimiento_caja IS NOT NULL)) OR ((id_cuenta IS NULL) AND (id_movimiento_caja IS NULL))))
);


--
-- Name: pagos_empleados; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.pagos_empleados (
    id_pago_empleado integer NOT NULL,
    id_empleado integer NOT NULL,
    periodo date NOT NULL,
    salario_pagado numeric(10,2) NOT NULL,
    anticipos numeric(10,2) DEFAULT 0 NOT NULL,
    bonificaciones numeric(10,2) DEFAULT 0 NOT NULL,
    descuentos numeric(10,2) DEFAULT 0 NOT NULL,
    fecha_pago timestamp without time zone DEFAULT now() NOT NULL,
    id_movimiento integer
);


--
-- Name: pagos_empleados_id_pago_empleado_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.pagos_empleados_id_pago_empleado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_empleados_id_pago_empleado_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.pagos_empleados_id_pago_empleado_seq OWNED BY edificio.pagos_empleados.id_pago_empleado;


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.pagos_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.pagos_id_pago_seq OWNED BY edificio.pagos.id_pago;


--
-- Name: parqueos; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.parqueos (
    id_parqueo integer NOT NULL,
    numero character varying(10) NOT NULL,
    id_departamento integer,
    estado character varying(20) DEFAULT 'Disponible'::character varying NOT NULL,
    fecha_asignacion timestamp(6) without time zone,
    id_persona integer
);


--
-- Name: parqueos_id_parqueo_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.parqueos_id_parqueo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parqueos_id_parqueo_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.parqueos_id_parqueo_seq OWNED BY edificio.parqueos.id_parqueo;


--
-- Name: personas; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.personas (
    id_persona integer NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    ci_nit character varying(30) NOT NULL,
    telefono character varying(30),
    correo character varying(150),
    direccion text,
    fecha_registro timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: personas_id_persona_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.personas_id_persona_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personas_id_persona_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.personas_id_persona_seq OWNED BY edificio.personas.id_persona;


--
-- Name: reglas_mora; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.reglas_mora (
    id_regla integer NOT NULL,
    tasa_interes numeric(5,2) NOT NULL,
    dias_gracia integer DEFAULT 0 NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario_creacion integer
);


--
-- Name: reglas_mora_id_regla_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.reglas_mora_id_regla_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reglas_mora_id_regla_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.reglas_mora_id_regla_seq OWNED BY edificio.reglas_mora.id_regla;


--
-- Name: roles; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.roles (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


--
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.roles_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.roles_id_rol_seq OWNED BY edificio.roles.id_rol;


--
-- Name: tipos_departamento; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.tipos_departamento (
    id_tipo integer NOT NULL,
    nombre character varying(10) NOT NULL,
    monto_expensa numeric(10,2) NOT NULL,
    tipo_departamento character varying,
    CONSTRAINT tipos_departamento_monto_expensa_check CHECK ((monto_expensa >= (0)::numeric))
);


--
-- Name: tipos_departamento_id_tipo_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.tipos_departamento_id_tipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_departamento_id_tipo_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.tipos_departamento_id_tipo_seq OWNED BY edificio.tipos_departamento.id_tipo;


--
-- Name: usuarios; Type: TABLE; Schema: edificio; Owner: -
--

CREATE TABLE edificio.usuarios (
    id_usuario integer NOT NULL,
    nombre_usuario character varying(50) NOT NULL,
    correo character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    id_rol integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    ultimo_acceso timestamp without time zone,
    bloqueado_hasta timestamp(6) without time zone,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    id_persona integer
);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: edificio; Owner: -
--

CREATE SEQUENCE edificio.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: edificio; Owner: -
--

ALTER SEQUENCE edificio.usuarios_id_usuario_seq OWNED BY edificio.usuarios.id_usuario;


--
-- Name: vw_flujo_mensual; Type: VIEW; Schema: edificio; Owner: -
--

CREATE VIEW edificio.vw_flujo_mensual AS
 SELECT date_trunc('month'::text, fecha) AS mes,
    sum(
        CASE
            WHEN ((tipo)::text = 'Ingreso'::text) THEN monto
            ELSE (0)::numeric
        END) AS total_ingresos,
    sum(
        CASE
            WHEN ((tipo)::text = 'Egreso'::text) THEN monto
            ELSE (0)::numeric
        END) AS total_egresos,
    sum(
        CASE
            WHEN ((tipo)::text = 'Ingreso'::text) THEN monto
            ELSE (- monto)
        END) AS balance
   FROM edificio.movimientos
  GROUP BY (date_trunc('month'::text, fecha))
  ORDER BY (date_trunc('month'::text, fecha));


--
-- Name: vw_historial_pagos_departamento; Type: VIEW; Schema: edificio; Owner: -
--

CREATE VIEW edificio.vw_historial_pagos_departamento AS
 SELECT d.numero AS departamento,
    pg.fecha_pago,
    pg.monto_pagado,
    pg.interes_pagado,
    pg.metodo_pago
   FROM (edificio.pagos pg
     JOIN edificio.departamentos d ON ((d.id_departamento = pg.id_departamento)))
  ORDER BY d.numero, pg.fecha_pago;


--
-- Name: vw_morosos; Type: VIEW; Schema: edificio; Owner: -
--

CREATE VIEW edificio.vw_morosos AS
 SELECT d.numero AS departamento,
    p.nombres,
    p.apellidos,
    e.periodo,
    e.saldo_pendiente,
    e.fecha_vencimiento
   FROM (((edificio.expensas e
     JOIN edificio.departamentos d ON ((d.id_departamento = e.id_departamento)))
     LEFT JOIN edificio.ocupantes_departamento od ON (((od.id_departamento = d.id_departamento) AND (od.fecha_fin IS NULL))))
     LEFT JOIN edificio.personas p ON ((p.id_persona = od.id_persona)))
  WHERE (((e.estado)::text = ANY ((ARRAY['Pendiente'::character varying, 'Moroso'::character varying, 'Parcial'::character varying])::text[])) AND (e.fecha_vencimiento < CURRENT_DATE));


--
-- Name: vw_pagos_pendientes_conciliar; Type: VIEW; Schema: edificio; Owner: -
--

CREATE VIEW edificio.vw_pagos_pendientes_conciliar AS
 SELECT id_pago,
    id_departamento,
    monto_pagado,
    metodo_pago,
    fecha_pago
   FROM edificio.pagos
  WHERE ((id_cuenta IS NULL) AND (id_movimiento_caja IS NULL));


--
-- Name: aplicaciones_anticipos id_aplicacion; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.aplicaciones_anticipos ALTER COLUMN id_aplicacion SET DEFAULT nextval('edificio.aplicaciones_anticipos_id_aplicacion_seq'::regclass);


--
-- Name: auditoria id_auditoria; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.auditoria ALTER COLUMN id_auditoria SET DEFAULT nextval('edificio.auditoria_id_auditoria_seq'::regclass);


--
-- Name: bauleras id_baulera; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.bauleras ALTER COLUMN id_baulera SET DEFAULT nextval('edificio.bauleras_id_baulera_seq'::regclass);


--
-- Name: caja id_movimiento_caja; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.caja ALTER COLUMN id_movimiento_caja SET DEFAULT nextval('edificio.caja_id_movimiento_caja_seq'::regclass);


--
-- Name: categorias_movimiento id_categoria; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.categorias_movimiento ALTER COLUMN id_categoria SET DEFAULT nextval('edificio.categorias_movimiento_id_categoria_seq'::regclass);


--
-- Name: comunicados id_comunicado; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados ALTER COLUMN id_comunicado SET DEFAULT nextval('edificio.comunicados_id_comunicado_seq'::regclass);


--
-- Name: comunicados_envios id_envio; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados_envios ALTER COLUMN id_envio SET DEFAULT nextval('edificio.comunicados_envios_id_envio_seq'::regclass);


--
-- Name: cuentas_bancarias id_cuenta; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.cuentas_bancarias ALTER COLUMN id_cuenta SET DEFAULT nextval('edificio.cuentas_bancarias_id_cuenta_seq'::regclass);


--
-- Name: departamentos id_departamento; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.departamentos ALTER COLUMN id_departamento SET DEFAULT nextval('edificio.departamentos_id_departamento_seq'::regclass);


--
-- Name: documentos id_documento; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.documentos ALTER COLUMN id_documento SET DEFAULT nextval('edificio.documentos_id_documento_seq'::regclass);


--
-- Name: empleados id_empleado; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.empleados ALTER COLUMN id_empleado SET DEFAULT nextval('edificio.empleados_id_empleado_seq'::regclass);


--
-- Name: expensas id_expensa; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.expensas ALTER COLUMN id_expensa SET DEFAULT nextval('edificio.expensas_id_expensa_seq'::regclass);


--
-- Name: movimientos id_movimiento; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos ALTER COLUMN id_movimiento SET DEFAULT nextval('edificio.movimientos_id_movimiento_seq'::regclass);


--
-- Name: movimientos_bancarios id_mov_bancario; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos_bancarios ALTER COLUMN id_mov_bancario SET DEFAULT nextval('edificio.movimientos_bancarios_id_mov_bancario_seq'::regclass);


--
-- Name: ocupantes_departamento id_ocupacion; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.ocupantes_departamento ALTER COLUMN id_ocupacion SET DEFAULT nextval('edificio.ocupantes_departamento_id_ocupacion_seq'::regclass);


--
-- Name: pagos id_pago; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos ALTER COLUMN id_pago SET DEFAULT nextval('edificio.pagos_id_pago_seq'::regclass);


--
-- Name: pagos_empleados id_pago_empleado; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos_empleados ALTER COLUMN id_pago_empleado SET DEFAULT nextval('edificio.pagos_empleados_id_pago_empleado_seq'::regclass);


--
-- Name: parqueos id_parqueo; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.parqueos ALTER COLUMN id_parqueo SET DEFAULT nextval('edificio.parqueos_id_parqueo_seq'::regclass);


--
-- Name: personas id_persona; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.personas ALTER COLUMN id_persona SET DEFAULT nextval('edificio.personas_id_persona_seq'::regclass);


--
-- Name: reglas_mora id_regla; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.reglas_mora ALTER COLUMN id_regla SET DEFAULT nextval('edificio.reglas_mora_id_regla_seq'::regclass);


--
-- Name: roles id_rol; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.roles ALTER COLUMN id_rol SET DEFAULT nextval('edificio.roles_id_rol_seq'::regclass);


--
-- Name: tipos_departamento id_tipo; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.tipos_departamento ALTER COLUMN id_tipo SET DEFAULT nextval('edificio.tipos_departamento_id_tipo_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('edificio.usuarios_id_usuario_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: aplicaciones_anticipos aplicaciones_anticipos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.aplicaciones_anticipos
    ADD CONSTRAINT aplicaciones_anticipos_pkey PRIMARY KEY (id_aplicacion);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);


--
-- Name: bauleras bauleras_numero_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.bauleras
    ADD CONSTRAINT bauleras_numero_key UNIQUE (numero);


--
-- Name: bauleras bauleras_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.bauleras
    ADD CONSTRAINT bauleras_pkey PRIMARY KEY (id_baulera);


--
-- Name: caja caja_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.caja
    ADD CONSTRAINT caja_pkey PRIMARY KEY (id_movimiento_caja);


--
-- Name: categorias_movimiento categorias_movimiento_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.categorias_movimiento
    ADD CONSTRAINT categorias_movimiento_pkey PRIMARY KEY (id_categoria);


--
-- Name: comunicados_envios comunicados_envios_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados_envios
    ADD CONSTRAINT comunicados_envios_pkey PRIMARY KEY (id_envio);


--
-- Name: comunicados comunicados_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados
    ADD CONSTRAINT comunicados_pkey PRIMARY KEY (id_comunicado);


--
-- Name: configuracion_global configuracion_global_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.configuracion_global
    ADD CONSTRAINT configuracion_global_pkey PRIMARY KEY (clave);


--
-- Name: cuentas_bancarias cuentas_bancarias_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_pkey PRIMARY KEY (id_cuenta);


--
-- Name: departamentos departamentos_numero_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.departamentos
    ADD CONSTRAINT departamentos_numero_key UNIQUE (numero);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id_departamento);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id_documento);


--
-- Name: empleados empleados_ci_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.empleados
    ADD CONSTRAINT empleados_ci_key UNIQUE (ci);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id_empleado);


--
-- Name: expensas expensas_id_departamento_periodo_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.expensas
    ADD CONSTRAINT expensas_id_departamento_periodo_key UNIQUE (id_departamento, periodo);


--
-- Name: expensas expensas_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.expensas
    ADD CONSTRAINT expensas_pkey PRIMARY KEY (id_expensa);


--
-- Name: movimientos_bancarios movimientos_bancarios_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos_bancarios
    ADD CONSTRAINT movimientos_bancarios_pkey PRIMARY KEY (id_mov_bancario);


--
-- Name: movimientos movimientos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos
    ADD CONSTRAINT movimientos_pkey PRIMARY KEY (id_movimiento);


--
-- Name: ocupantes_departamento ocupantes_departamento_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.ocupantes_departamento
    ADD CONSTRAINT ocupantes_departamento_pkey PRIMARY KEY (id_ocupacion);


--
-- Name: pagos_empleados pagos_empleados_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos_empleados
    ADD CONSTRAINT pagos_empleados_pkey PRIMARY KEY (id_pago_empleado);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- Name: parqueos parqueos_numero_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.parqueos
    ADD CONSTRAINT parqueos_numero_key UNIQUE (numero);


--
-- Name: parqueos parqueos_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.parqueos
    ADD CONSTRAINT parqueos_pkey PRIMARY KEY (id_parqueo);


--
-- Name: personas personas_ci_nit_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.personas
    ADD CONSTRAINT personas_ci_nit_key UNIQUE (ci_nit);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id_persona);


--
-- Name: reglas_mora reglas_mora_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.reglas_mora
    ADD CONSTRAINT reglas_mora_pkey PRIMARY KEY (id_regla);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- Name: tipos_departamento tipos_departamento_nombre_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.tipos_departamento
    ADD CONSTRAINT tipos_departamento_nombre_key UNIQUE (nombre);


--
-- Name: tipos_departamento tipos_departamento_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.tipos_departamento
    ADD CONSTRAINT tipos_departamento_pkey PRIMARY KEY (id_tipo);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_nombre_usuario_key; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios
    ADD CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: categorias_movimiento_nombre_tipo_key; Type: INDEX; Schema: edificio; Owner: -
--

CREATE UNIQUE INDEX categorias_movimiento_nombre_tipo_key ON edificio.categorias_movimiento USING btree (nombre, tipo);


--
-- Name: idx_aplicacion_anticipo_expensa; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_aplicacion_anticipo_expensa ON edificio.aplicaciones_anticipos USING btree (id_expensa);


--
-- Name: idx_aplicacion_anticipo_pago; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_aplicacion_anticipo_pago ON edificio.aplicaciones_anticipos USING btree (id_pago);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_auditoria_fecha ON edificio.auditoria USING btree (fecha_hora DESC);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON edificio.auditoria USING btree (tabla_afectada);


--
-- Name: idx_auditoria_usuario_fecha; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_auditoria_usuario_fecha ON edificio.auditoria USING btree (id_usuario, fecha_hora DESC);


--
-- Name: idx_departamentos_tipo; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_departamentos_tipo ON edificio.departamentos USING btree (id_tipo);


--
-- Name: idx_expensas_deuda_vencimiento; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_expensas_deuda_vencimiento ON edificio.expensas USING btree (fecha_vencimiento) WHERE (saldo_pendiente > (0)::numeric);


--
-- Name: idx_expensas_estado; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_expensas_estado ON edificio.expensas USING btree (estado);


--
-- Name: idx_movimientos_categoria; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_movimientos_categoria ON edificio.movimientos USING btree (id_categoria);


--
-- Name: idx_movimientos_fecha; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_movimientos_fecha ON edificio.movimientos USING btree (fecha);


--
-- Name: idx_ocupantes_departamento; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_ocupantes_departamento ON edificio.ocupantes_departamento USING btree (id_departamento);


--
-- Name: idx_pagos_cuenta; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_cuenta ON edificio.pagos USING btree (id_cuenta);


--
-- Name: idx_pagos_departamento_fecha; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_departamento_fecha ON edificio.pagos USING btree (id_departamento, fecha_pago DESC);


--
-- Name: idx_pagos_empleados_movimiento; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_empleados_movimiento ON edificio.pagos_empleados USING btree (id_movimiento);


--
-- Name: idx_pagos_expensa_fecha; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_expensa_fecha ON edificio.pagos USING btree (id_expensa, fecha_pago DESC);


--
-- Name: idx_pagos_movimiento_caja; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_movimiento_caja ON edificio.pagos USING btree (id_movimiento_caja);


--
-- Name: idx_pagos_pago_original; Type: INDEX; Schema: edificio; Owner: -
--

CREATE INDEX idx_pagos_pago_original ON edificio.pagos USING btree (id_pago_original);


--
-- Name: uq_ocupante_activo; Type: INDEX; Schema: edificio; Owner: -
--

CREATE UNIQUE INDEX uq_ocupante_activo ON edificio.ocupantes_departamento USING btree (id_departamento, tipo_ocupante) WHERE (fecha_fin IS NULL);


--
-- Name: expensas trg_auditoria_expensas; Type: TRIGGER; Schema: edificio; Owner: -
--

CREATE TRIGGER trg_auditoria_expensas AFTER INSERT OR DELETE OR UPDATE ON edificio.expensas FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();


--
-- Name: movimientos trg_auditoria_movimientos; Type: TRIGGER; Schema: edificio; Owner: -
--

CREATE TRIGGER trg_auditoria_movimientos AFTER INSERT OR DELETE OR UPDATE ON edificio.movimientos FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();


--
-- Name: pagos trg_auditoria_pagos; Type: TRIGGER; Schema: edificio; Owner: -
--

CREATE TRIGGER trg_auditoria_pagos AFTER INSERT OR DELETE OR UPDATE ON edificio.pagos FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();


--
-- Name: aplicaciones_anticipos aplicaciones_anticipos_id_expensa_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.aplicaciones_anticipos
    ADD CONSTRAINT aplicaciones_anticipos_id_expensa_fkey FOREIGN KEY (id_expensa) REFERENCES edificio.expensas(id_expensa) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: aplicaciones_anticipos aplicaciones_anticipos_id_pago_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.aplicaciones_anticipos
    ADD CONSTRAINT aplicaciones_anticipos_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES edificio.pagos(id_pago) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auditoria auditoria_id_usuario_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.auditoria
    ADD CONSTRAINT auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bauleras bauleras_id_departamento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.bauleras
    ADD CONSTRAINT bauleras_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES edificio.departamentos(id_departamento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bauleras bauleras_id_persona_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.bauleras
    ADD CONSTRAINT bauleras_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: caja caja_id_usuario_registro_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.caja
    ADD CONSTRAINT caja_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: comunicados_envios comunicados_envios_id_comunicado_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados_envios
    ADD CONSTRAINT comunicados_envios_id_comunicado_fkey FOREIGN KEY (id_comunicado) REFERENCES edificio.comunicados(id_comunicado) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comunicados_envios comunicados_envios_id_persona_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados_envios
    ADD CONSTRAINT comunicados_envios_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: comunicados comunicados_id_usuario_creador_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.comunicados
    ADD CONSTRAINT comunicados_id_usuario_creador_fkey FOREIGN KEY (id_usuario_creador) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departamentos departamentos_id_propietario_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.departamentos
    ADD CONSTRAINT departamentos_id_propietario_fkey FOREIGN KEY (id_propietario) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departamentos departamentos_id_tipo_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.departamentos
    ADD CONSTRAINT departamentos_id_tipo_fkey FOREIGN KEY (id_tipo) REFERENCES edificio.tipos_departamento(id_tipo) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documentos documentos_id_usuario_subida_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.documentos
    ADD CONSTRAINT documentos_id_usuario_subida_fkey FOREIGN KEY (id_usuario_subida) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expensas expensas_id_departamento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.expensas
    ADD CONSTRAINT expensas_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES edificio.departamentos(id_departamento) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_bancarios movimientos_bancarios_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos_bancarios
    ADD CONSTRAINT movimientos_bancarios_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES edificio.cuentas_bancarias(id_cuenta) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos_bancarios movimientos_bancarios_id_movimiento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos_bancarios
    ADD CONSTRAINT movimientos_bancarios_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES edificio.movimientos(id_movimiento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: movimientos movimientos_id_categoria_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos
    ADD CONSTRAINT movimientos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES edificio.categorias_movimiento(id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimientos movimientos_id_usuario_registro_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.movimientos
    ADD CONSTRAINT movimientos_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ocupantes_departamento ocupantes_departamento_id_departamento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.ocupantes_departamento
    ADD CONSTRAINT ocupantes_departamento_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES edificio.departamentos(id_departamento) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ocupantes_departamento ocupantes_departamento_id_persona_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.ocupantes_departamento
    ADD CONSTRAINT ocupantes_departamento_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos_empleados pagos_empleados_id_empleado_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos_empleados
    ADD CONSTRAINT pagos_empleados_id_empleado_fkey FOREIGN KEY (id_empleado) REFERENCES edificio.empleados(id_empleado) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos_empleados pagos_empleados_id_movimiento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos_empleados
    ADD CONSTRAINT pagos_empleados_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES edificio.movimientos(id_movimiento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES edificio.cuentas_bancarias(id_cuenta) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_id_departamento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES edificio.departamentos(id_departamento) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos pagos_id_expensa_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_expensa_fkey FOREIGN KEY (id_expensa) REFERENCES edificio.expensas(id_expensa) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_id_movimiento_caja_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_movimiento_caja_fkey FOREIGN KEY (id_movimiento_caja) REFERENCES edificio.caja(id_movimiento_caja) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_id_pago_original_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_pago_original_fkey FOREIGN KEY (id_pago_original) REFERENCES edificio.pagos(id_pago) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pagos pagos_id_usuario_registro_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.pagos
    ADD CONSTRAINT pagos_id_usuario_registro_fkey FOREIGN KEY (id_usuario_registro) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: parqueos parqueos_id_departamento_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.parqueos
    ADD CONSTRAINT parqueos_id_departamento_fkey FOREIGN KEY (id_departamento) REFERENCES edificio.departamentos(id_departamento) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: parqueos parqueos_id_persona_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.parqueos
    ADD CONSTRAINT parqueos_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reglas_mora reglas_mora_id_usuario_creacion_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.reglas_mora
    ADD CONSTRAINT reglas_mora_id_usuario_creacion_fkey FOREIGN KEY (id_usuario_creacion) REFERENCES edificio.usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios usuarios_id_persona_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios
    ADD CONSTRAINT usuarios_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES edificio.personas(id_persona) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usuarios usuarios_id_rol_fkey; Type: FK CONSTRAINT; Schema: edificio; Owner: -
--

ALTER TABLE ONLY edificio.usuarios
    ADD CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES edificio.roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict JSpK8gNsgmkL8mD1M7xL2QmMKTPmCg6eh7Rfcyozpv1NENehsHUAD1LP8HyIbsI


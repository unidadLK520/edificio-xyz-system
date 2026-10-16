// backend/src/modules/database-failover/db-failover.service.ts
// Servicio de gestión de Failover de Base de Datos (Principal / Respaldo)
// Cumple con:
// - Conmutación SOLO ante errores de conexión (P1001, P1002, P1008, P1017, timeout, ECONNREFUSED)
// - NUNCA ante errores de negocio (P2xxx ni 4xx)
// - Un reintento a la principal antes de conmutar
// - SIN escritura doble ni reenvío de la operación que falló (responde 503)
// - Las siguientes peticiones usan la BD activa (respaldo)
// - Sin regreso automático (solo manual por POST /health/db/principal)
// - Validación de esquema en el respaldo antes de conmutar
// - Logs limpios sin credenciales

import type { PrismaClient } from '@edificio-xyz/database';
import * as dbModule from '@edificio-xyz/database';

export type ActiveDatabaseType = 'principal' | 'respaldo';

export interface DatabaseStatus {
  activeDb: ActiveDatabaseType;
  bdActiva: ActiveDatabaseType;
  ultimoCambio: {
    fecha: string;
    motivo: string;
  };
  fechaUltimoCambio: string;
  motivoUltimoCambio: string;
}

function getPrismaClientConstructor(): any {
  return (dbModule as any).PrismaClient;
}

function safeSetPrismaClient(client: PrismaClient): void {
  if (typeof (dbModule as any).setPrismaClient === 'function') {
    (dbModule as any).setPrismaClient(client);
  }
}

function safeSetPrismaQueryInterceptor(
  interceptor: ((execute: () => Promise<any>) => Promise<any>) | null
): void {
  if (typeof (dbModule as any).setPrismaQueryInterceptor === 'function') {
    (dbModule as any).setPrismaQueryInterceptor(interceptor);
  }
}

export class DatabaseFailoverService {
  private activeDb: ActiveDatabaseType = 'principal';
  private lastChange = {
    fecha: new Date().toISOString(),
    motivo: 'Inicialización del servicio de base de datos',
  };

  private primaryClient: PrismaClient | null = null;
  private fallbackClient: PrismaClient | null = null;
  private isFailoverInProgress = false;
  private isInitialized = false;

  constructor() {
    // Inicialización perezosa: no instanciar clientes ni interceptores al importar
    // para evitar efectos secundarios en entornos de prueba o imports de rutas.
  }

  public ensureInitialized(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.initClients();
    this.attachInterceptor();
  }

  private initClients() {
    const ClientCtor = getPrismaClientConstructor();
    if (typeof ClientCtor !== 'function') {
      return;
    }

    const primaryUrl = process.env.DATABASE_URL;
    if (primaryUrl) {
      this.primaryClient = new ClientCtor({
        datasources: { db: { url: primaryUrl } },
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
      safeSetPrismaClient(this.primaryClient!);
    }

    const fallbackUrl = process.env.FALLBACK_DATABASE_URL;
    if (fallbackUrl) {
      this.fallbackClient = new ClientCtor({
        datasources: { db: { url: fallbackUrl } },
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    }
  }

  private attachInterceptor() {
    safeSetPrismaQueryInterceptor(async (execute: () => Promise<any>) => {
      try {
        return await execute();
      } catch (err: any) {
        return await this.handleQueryError(err, execute);
      }
    });
  }

  public isConnectionError(err: any): boolean {
    if (!err) return false;

    // Errores de negocio Prisma (P2xxx): restricciones, duplicados, no encontrado, etc. NUNCA son de conexión
    if (typeof err.code === 'string' && err.code.startsWith('P2')) {
      return false;
    }

    // Errores con statusCode 4xx (400, 401, 403, 404, 409, 422): NUNCA conmutan
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      return false;
    }

    // Códigos explícitos de error de conexión de Prisma
    const prismaConnCodes = ['P1001', 'P1002', 'P1008', 'P1017'];
    if (typeof err.code === 'string' && prismaConnCodes.includes(err.code)) {
      return true;
    }

    // Errores del sistema operativo / socket de red
    const netCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ENOTFOUND'];
    if (typeof err.code === 'string' && netCodes.includes(err.code)) {
      return true;
    }

    // Detección por texto del mensaje
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes("can't reach database server") ||
      msg.includes('cant reach database server') ||
      msg.includes('connection refused') ||
      msg.includes('econnrefused') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('connect_timeout') ||
      msg.includes('pool_timeout') ||
      msg.includes('connection closed') ||
      msg.includes('server has closed the connection')
    ) {
      return true;
    }

    return false;
  }

  private async checkFallbackSchema(client: PrismaClient): Promise<{
    valid: boolean;
    missingTables: string[];
    missingColumns: string[];
    error?: string;
  }> {
    try {
      // 1. Probar conectividad con el respaldo
      await client.$queryRawUnsafe('SELECT 1');

      // 2. Verificar que el esquema contenga las tablas requeridas
      const tableRows = await client.$queryRawUnsafe<any[]>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'edificio';
      `);
      const existingTables = new Set((tableRows || []).map((r: any) => r.table_name));

      const requiredTables = [
        'usuarios',
        'roles',
        'departamentos',
        'personas',
        'expensas',
        'pagos',
        'sesiones',
        'tarifas_agua',
        'lecturas_agua',
        'reglas_mora',
        'tipos_departamento',
      ];
      const missingTables = requiredTables.filter((t) => !existingTables.has(t));

      // 3. Verificar que contenga las columnas requeridas
      const colRows = await client.$queryRawUnsafe<any[]>(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'edificio';
      `);
      const existingCols = new Set((colRows || []).map((r: any) => `${r.table_name}.${r.column_name}`));

      const requiredColumns = [
        'tipos_departamento.activo',
        'expensas.monto_base',
        'expensas.monto_agua',
        'pagos.id_persona_pagador',
      ];
      const missingColumns = requiredColumns.filter((c) => !existingCols.has(c));

      const valid = missingTables.length === 0 && missingColumns.length === 0;
      return { valid, missingTables, missingColumns };
    } catch (err: any) {
      return { valid: false, missingTables: [], missingColumns: [], error: err.message || 'Error de conexión' };
    }
  }

  public async handleQueryError(err: any, execute: () => Promise<any>): Promise<never> {
    this.ensureInitialized();
    if (!this.isConnectionError(err)) {
      throw err;
    }

    // Si ya estamos en respaldo, no conmutamos a otro lugar; lanzamos 503
    if (this.activeDb !== 'principal') {
      const error503 = new Error('Error de conexión a la base de datos de respaldo. Servicio no disponible.') as any;
      error503.statusCode = 503;
      error503.code = 'SERVICE_UNAVAILABLE';
      throw error503;
    }

    // Estamos en principal y ocurrió un error de conexión:
    // 1. Un reintento a la principal
    let retrySucceeded = false;
    try {
      if (this.primaryClient) {
        await this.primaryClient.$queryRawUnsafe('SELECT 1');
        retrySucceeded = true;
      }
    } catch {
      retrySucceeded = false;
    }

    if (retrySucceeded) {
      // El glitch en la principal fue momentáneo; no conmutamos
      throw err;
    }

    // 2. La principal está caída de forma confirmada: proceder a conmutar
    if (!this.isFailoverInProgress) {
      this.isFailoverInProgress = true;
      try {
        const fallbackUrl = process.env.FALLBACK_DATABASE_URL;
        if (!fallbackUrl) {
          console.error('[DB-FAILOVER] Fallo de conexión en BD principal pero FALLBACK_DATABASE_URL no está configurada.');
          const error503 = new Error('Base de datos principal no disponible y respaldo no configurado.') as any;
          error503.statusCode = 503;
          error503.code = 'SERVICE_UNAVAILABLE';
          throw error503;
        }

        if (!this.fallbackClient) {
          const ClientCtor = getPrismaClientConstructor();
          this.fallbackClient = new ClientCtor({
            datasources: { db: { url: fallbackUrl } },
            log: ['error'],
          });
        }

        // 3. Antes de conmutar verifica que el respaldo tiene el esquema necesario; si no, 503 listando lo que falta
        const schemaValidation = await this.checkFallbackSchema(this.fallbackClient!);
        if (!schemaValidation.valid) {
          const missingItems: string[] = [];
          if (schemaValidation.missingTables.length > 0) {
            missingItems.push(`Tablas faltantes: [${schemaValidation.missingTables.join(', ')}]`);
          }
          if (schemaValidation.missingColumns.length > 0) {
            missingItems.push(`Columnas faltantes: [${schemaValidation.missingColumns.join(', ')}]`);
          }
          if (schemaValidation.error) {
            missingItems.push(`Fallo de conexión: ${schemaValidation.error}`);
          }
          const detailMsg = missingItems.join('; ');

          console.error(`[DB-FAILOVER] Conmutación abortada: el respaldo no cuenta con el esquema necesario. ${detailMsg}`);
          const error503 = new Error(`Base de datos de respaldo no disponible o no cuenta con el esquema necesario. ${detailMsg}`) as any;
          error503.statusCode = 503;
          error503.code = 'SERVICE_UNAVAILABLE';
          error503.details = {
            missingTables: schemaValidation.missingTables,
            missingColumns: schemaValidation.missingColumns,
          };
          throw error503;
        }

        // 4. Conmutar todo el cliente al respaldo
        this.activeDb = 'respaldo';
        this.lastChange = {
          fecha: new Date().toISOString(),
          motivo: `Conmutación automática por fallo de conexión en base de datos principal (${err.code || 'TIMEOUT/CONNECTION_LOST'})`,
        };

        safeSetPrismaClient(this.fallbackClient!);
        console.log(`[DB-FAILOVER] ${this.lastChange.fecha} - Conmutación completada exitosamente a Base de Datos de Respaldo. Motivo: ${this.lastChange.motivo}`);
      } finally {
        this.isFailoverInProgress = false;
      }
    }

    // 5. SIN escritura doble ni reenvío de la operación que falló: responde 503
    const failover503 = new Error('Fallo de conexión a la base de datos principal. La operación fue abortada por seguridad y el sistema ha conmutado a la base de datos de respaldo. Por favor, reintente su solicitud.') as any;
    failover503.statusCode = 503;
    failover503.code = 'SERVICE_UNAVAILABLE';
    throw failover503;
  }

  public async restorePrincipal(): Promise<DatabaseStatus> {
    this.ensureInitialized();
    if (!this.primaryClient) {
      const primaryUrl = process.env.DATABASE_URL;
      if (!primaryUrl) {
        const err = new Error('DATABASE_URL principal no configurada.') as any;
        err.statusCode = 503;
        throw err;
      }
      const ClientCtor = getPrismaClientConstructor();
      this.primaryClient = new ClientCtor({
        datasources: { db: { url: primaryUrl } },
        log: ['error'],
      });
    }

    // Comprobar la principal antes de conmutar
    try {
      await this.primaryClient!.$queryRawUnsafe('SELECT 1');
    } catch (checkErr: any) {
      console.error('[DB-FAILOVER] Restauración a principal fallida: no superó la prueba de conexión.');
      const err = new Error('La base de datos principal no está disponible o no respondió a la prueba de conectividad.') as any;
      err.statusCode = 503;
      err.code = 'SERVICE_UNAVAILABLE';
      throw err;
    }

    // Conmuta a la principal
    this.activeDb = 'principal';
    this.lastChange = {
      fecha: new Date().toISOString(),
      motivo: 'Restauración manual a la base de datos principal solicitada por Administrador',
    };

    safeSetPrismaClient(this.primaryClient!);
    console.log(`[DB-FAILOVER] ${this.lastChange.fecha} - Base de datos principal comprobada y restaurada como activa.`);

    return this.getStatus();
  }

  public getStatus(): DatabaseStatus {
    this.ensureInitialized();
    return {
      activeDb: this.activeDb,
      bdActiva: this.activeDb,
      ultimoCambio: { ...this.lastChange },
      fechaUltimoCambio: this.lastChange.fecha,
      motivoUltimoCambio: this.lastChange.motivo,
    };
  }

  // Métodos de apoyo para pruebas unitarias / tests sin tocar la BD real
  public setPrimaryClientForTesting(client: PrismaClient) {
    this.ensureInitialized();
    this.primaryClient = client;
    if (this.activeDb === 'principal') {
      safeSetPrismaClient(client);
    }
  }

  public setFallbackClientForTesting(client: PrismaClient) {
    this.ensureInitialized();
    this.fallbackClient = client;
    if (this.activeDb === 'respaldo') {
      safeSetPrismaClient(client);
    }
  }

  public setActiveDbForTesting(db: ActiveDatabaseType) {
    this.ensureInitialized();
    this.activeDb = db;
    if (db === 'principal' && this.primaryClient) {
      safeSetPrismaClient(this.primaryClient);
    } else if (db === 'respaldo' && this.fallbackClient) {
      safeSetPrismaClient(this.fallbackClient);
    }
  }

  public resetForTesting(defaultClient?: PrismaClient) {
    this.ensureInitialized();
    this.activeDb = 'principal';
    this.isFailoverInProgress = false;
    this.lastChange = {
      fecha: new Date().toISOString(),
      motivo: 'Reset de pruebas',
    };
    if (defaultClient) {
      this.primaryClient = defaultClient;
      safeSetPrismaClient(defaultClient);
    }
  }
}

export const dbFailoverService = new DatabaseFailoverService();

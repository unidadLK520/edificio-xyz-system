//-----------------------------Giovani Quiroz------------------------
// backend/tests/test_hu02_personas_unit.ts
// Suite de pruebas unitarias exhaustivas para HU02: Administración de Copropietarios (CA1 a CA8)

import 'dotenv/config';
import process from 'node:process';
import { PersonasService } from '../src/modules/personas/personas.service';
import { AuditoriaService } from '../src/modules/auditoria/auditoria.service';
import {
  crearPersonaSchema,
  actualizarPersonaSchema,
  asignarUnidadSchema,
  finalizarOcupacionSchema,
  ServiceResult,
} from '../src/modules/personas/personas.types';

async function runUnitTests() {
  console.log('🧪 ====================================================================');
  console.log('🧪 Iniciando pruebas unitarias HU02: Administración de Copropietarios');
  console.log('🧪 ====================================================================\n');

  let auditRecords: any[] = [];
  let personasDb: any[] = [];
  let ocupacionesDb: any[] = [];
  let departamentosDb: any[] = [
    { idDepartamento: 101, numero: '101', piso: 1, idPropietario: null },
    { idDepartamento: 102, numero: '102', piso: 1, idPropietario: null },
  ];

  // Mock del servicio de Auditoría en memoria
  const mockAuditoriaRepo: any = {
    crear: async (params: any) => {
      const record = {
        idAuditoria: BigInt(auditRecords.length + 1),
        ...params,
        fechaHora: new Date(),
      };
      auditRecords.push(record);
      return record;
    },
  };
  const auditoriaService = new AuditoriaService(mockAuditoriaRepo);

  // Mock del repositorio de Personas en memoria
  const mockPersonasRepo: any = {
    findByCiNit: async (ciNit: string) => {
      return personasDb.find((p) => p.ciNit === ciNit) || null;
    },

    findById: async (idPersona: number) => {
      const p = personasDb.find((item) => item.idPersona === idPersona);
      if (!p) return null;
      const deptos = departamentosDb.filter((d) => d.idPropietario === idPersona);
      const ocupaciones = ocupacionesDb
        .filter((o) => o.idPersona === idPersona)
        .map((o) => ({
          ...o,
          departamento: departamentosDb.find((d) => d.idDepartamento === o.idDepartamento),
        }));
      return {
        ...p,
        departamentosPropios: deptos,
        ocupaciones,
      };
    },

    findAll: async (params: { buscar?: string; page: number; limit: number; tipoOcupante?: string }) => {
      let filtered = [...personasDb];
      if (params.buscar) {
        const term = params.buscar.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.nombres.toLowerCase().includes(term) ||
            p.apellidos.toLowerCase().includes(term) ||
            p.ciNit.toLowerCase().includes(term)
        );
      }
      if (params.tipoOcupante) {
        filtered = filtered.filter((p) =>
          ocupacionesDb.some(
            (o) => o.idPersona === p.idPersona && o.tipoOcupante === params.tipoOcupante && o.fechaFin === null
          )
        );
      }
      const skip = (params.page - 1) * params.limit;
      const paginated = filtered.slice(skip, skip + params.limit);
      return {
        personas: paginated.map((p) => ({
          ...p,
          departamentosPropios: departamentosDb.filter((d) => d.idPropietario === p.idPersona),
          ocupaciones: ocupacionesDb.filter((o) => o.idPersona === p.idPersona && o.fechaFin === null),
          _count: {
            departamentosPropios: departamentosDb.filter((d) => d.idPropietario === p.idPersona).length,
            ocupaciones: ocupacionesDb.filter((o) => o.idPersona === p.idPersona).length,
          },
        })),
        total: filtered.length,
      };
    },

    create: async (data: any) => {
      const persona = {
        idPersona: personasDb.length + 1,
        ...data,
        fechaRegistro: new Date(),
      };
      personasDb.push(persona);
      return persona;
    },

    update: async (idPersona: number, data: any) => {
      const idx = personasDb.findIndex((p) => p.idPersona === idPersona);
      if (idx === -1) throw new Error('Persona no encontrada');
      personasDb[idx] = { ...personasDb[idx], ...data };
      return personasDb[idx];
    },

    findDepartamentoById: async (idDepartamento: number) => {
      const d = departamentosDb.find((dep) => dep.idDepartamento === idDepartamento);
      if (!d) return null;
      const prop = personasDb.find((p) => p.idPersona === d.idPropietario);
      return {
        ...d,
        propietario: prop ? { idPersona: prop.idPersona, nombres: prop.nombres, apellidos: prop.apellidos } : null,
      };
    },

    asignarOcupante: async (params: any) => {
      const ocupacion = {
        idOcupacion: ocupacionesDb.length + 1,
        idPersona: params.idPersona,
        idDepartamento: params.idDepartamento,
        tipoOcupante: params.tipoOcupante,
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin || null,
        departamento: departamentosDb.find((d) => d.idDepartamento === params.idDepartamento),
        persona: personasDb.find((p) => p.idPersona === params.idPersona),
      };
      ocupacionesDb.push(ocupacion);
      if (params.actualizarPropietarioDirecto || params.tipoOcupante === 'Propietario') {
        const dep = departamentosDb.find((d) => d.idDepartamento === params.idDepartamento);
        if (dep) dep.idPropietario = params.idPersona;
      }
      return ocupacion;
    },

    findOcupacionById: async (idOcupacion: number) => {
      return ocupacionesDb.find((o) => o.idOcupacion === idOcupacion) || null;
    },

    finalizarOcupacion: async (idOcupacion: number, fechaFin: Date) => {
      const idx = ocupacionesDb.findIndex((o) => o.idOcupacion === idOcupacion);
      if (idx === -1) throw new Error('Ocupacion no encontrada');
      ocupacionesDb[idx].fechaFin = fechaFin;
      return ocupacionesDb[idx];
    },

    findHistorialPorPersona: async (idPersona: number) => {
      return ocupacionesDb
        .filter((o) => o.idPersona === idPersona)
        .map((o) => ({
          ...o,
          departamento: departamentosDb.find((d) => d.idDepartamento === o.idDepartamento),
        }));
    },

    findHistorialPorDepartamento: async (idDepartamento: number) => {
      return ocupacionesDb
        .filter((o) => o.idDepartamento === idDepartamento)
        .map((o) => ({
          ...o,
          persona: personasDb.find((p) => p.idPersona === o.idPersona),
        }));
    },
  };

  const service = new PersonasService(mockPersonasRepo, auditoriaService);

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(condition: boolean, title: string) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: ${title}`);
      throw new Error(`Test fallido: ${title}`);
    }
  }

  function assertSuccess<T>(
    res: ServiceResult<T>,
    title: string
  ): asserts res is { success: true; data: T } {
    totalTests++;
    if (res.success) {
      console.log(`   ✅ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: ${title}`);
      throw new Error(`Test fallido: ${title} - Error: ${(res as any).error}`);
    }
  }

  function assertFailure<T>(
    res: ServiceResult<T>,
    title: string
  ): asserts res is { success: false; error: string; message: string; statusCode?: number } {
    totalTests++;
    if (!res.success) {
      console.log(`   ✅ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: ${title}`);
      throw new Error(`Test fallido: ${title} - Se esperaba fallo`);
    }
  }

  // ==========================================================================
  // Test 1: CA1 - Registro de Copropietario con datos válidos
  // ==========================================================================
  console.log('\n1️⃣ [CA1] Registro de nueva persona / copropietario');
  const res1 = await service.crearPersona(
    {
      ciNit: '1234567-LP',
      nombres: 'Carlos Alberto',
      apellidos: 'Mendoza Vargas',
      telefono: '77889900',
      correo: 'carlos.mendoza@email.com',
      direccion: 'Av. 6 de Agosto #450',
    },
    1 // idOperador (Admin)
  );
  assertSuccess(res1, 'Creación de persona retorna success: true');
  assertTest(res1.data.idPersona === 1, 'Persona recibe ID 1');
  assertTest(res1.data.ciNit === '1234567-LP', 'CI/NIT coincide');
  assertTest(auditRecords.length === 1, 'Se registró 1 evento en auditoría');
  assertTest(auditRecords[0].accion === 'INSERT', 'Acción de auditoría es INSERT');
  assertTest(auditRecords[0].tablaAfectada === 'personas', 'Tabla auditada es personas');

  // ==========================================================================
  // Test 2: CA4 - Validación de duplicado por CI/NIT
  // ==========================================================================
  console.log('\n2️⃣ [CA4] Validación de duplicados (mismo CI/NIT)');
  const resDuplicado = await service.crearPersona(
    {
      ciNit: '1234567-LP', // Mismo CI que Carlos Mendoza
      nombres: 'Otro',
      apellidos: 'Usuario',
    },
    1
  );
  assertFailure(resDuplicado, 'Rechaza registro con CI/NIT duplicado');
  assertTest(resDuplicado.error === 'PERSONA_DUPLICADA_CI', 'Código de error es PERSONA_DUPLICADA_CI');
  assertTest(resDuplicado.statusCode === 409, 'Status code es 409 Conflict');
  assertTest(personasDb.length === 1, 'No se agregó ningún registro duplicado a la BD');

  // ==========================================================================
  // Test 3: Validaciones de Schemas Zod
  // ==========================================================================
  console.log('\n3️⃣ [ZOD] Validación estricta de esquemas de entrada');
  const invalidoCi = crearPersonaSchema.safeParse({
    ciNit: '12', // Menos de 3 caracteres
    nombres: 'Ana',
    apellidos: 'Pérez',
  });
  assertTest(!invalidoCi.success, 'Rechaza CI/NIT con menos de 3 caracteres');

  const invalidoCorreo = crearPersonaSchema.safeParse({
    ciNit: '7654321',
    nombres: 'Ana',
    apellidos: 'Pérez',
    correo: 'correo_no_valido',
  });
  assertTest(!invalidoCorreo.success, 'Rechaza correo con formato inválido');

  const validoConNull = crearPersonaSchema.safeParse({
    ciNit: '7654321',
    nombres: 'Ana',
    apellidos: 'Pérez',
    correo: null,
    telefono: null,
  });
  assertTest(validoConNull.success, 'Acepta teléfono y correo nulos/opcionales');

  // Crear segunda persona para pruebas de búsqueda y asignación
  const res2 = await service.crearPersona(
    {
      ciNit: '7654321-SC',
      nombres: 'Ana María',
      apellidos: 'Gómez Torrez',
      telefono: '60123456',
      correo: 'ana.gomez@email.com',
    },
    1
  );
  assertSuccess(res2, 'Se registra segunda persona exitosamente');

  // ==========================================================================
  // Test 4: CA2 & CA5 - Búsqueda y listado paginado
  // ==========================================================================
  console.log('\n4️⃣ [CA2, CA5] Búsqueda y consulta paginada');
  const listadoCompleto = await service.obtenerPersonas({ page: 1, limit: 10 });
  assertTest(listadoCompleto.meta.total === 2, 'Total de personas es 2');
  assertTest(listadoCompleto.data.length === 2, 'Retorna 2 registros');

  const busquedaNombre = await service.obtenerPersonas({ buscar: 'mendoza', page: 1, limit: 10 });
  assertTest(busquedaNombre.meta.total === 1, 'Búsqueda por apellido encuentra 1 resultado');
  assertTest(busquedaNombre.data[0].apellidos === 'Mendoza Vargas', 'Resultado corresponde a Mendoza');

  const busquedaCi = await service.obtenerPersonas({ buscar: '7654321', page: 1, limit: 10 });
  assertTest(busquedaCi.meta.total === 1, 'Búsqueda por fragmento de CI encuentra 1 resultado');
  assertTest(busquedaCi.data[0].ciNit === '7654321-SC', 'Resultado corresponde a Ana Gómez');

  // ==========================================================================
  // Test 5: CA8 - Consulta detallada por ID
  // ==========================================================================
  console.log('\n5️⃣ [CA8] Detalle de persona por ID');
  const detalle1 = await service.obtenerPersonaPorId(1);
  assertSuccess(detalle1, 'Consulta de persona existente es exitosa');
  assertTest(detalle1.data.nombres === 'Carlos Alberto', 'Detalle incluye nombres correctos');

  const detalleInexistente = await service.obtenerPersonaPorId(999);
  assertFailure(detalleInexistente, 'Persona inexistente retorna error');
  assertTest(detalleInexistente.statusCode === 404, 'Código de estado es 404');

  // ==========================================================================
  // Test 6: CA3 - Modificación de datos y auditoría de UPDATE
  // ==========================================================================
  console.log('\n6️⃣ [CA3] Modificación de persona con auditoría de cambios');
  const resUpdate = await service.actualizarPersona(
    1,
    {
      telefono: '79998888',
      direccion: 'Nueva dirección actualizada #123',
    },
    1 // idOperador
  );
  assertSuccess(resUpdate, 'Actualización exitosa');
  assertTest(resUpdate.data.telefono === '79998888', 'Teléfono fue modificado');

  const auditUpdate = auditRecords.find((a) => a.accion === 'UPDATE' && a.idRegistro === '1');
  assertTest(auditUpdate !== undefined, 'Se generó registro de auditoría para UPDATE');
  assertTest(auditUpdate.datosAnteriores.telefono === '77889900', 'Auditoría guarda teléfono anterior');
  assertTest(auditUpdate.datosNuevos.telefono === '79998888', 'Auditoría guarda teléfono nuevo');

  // Intento de modificar CI para colisionar con otra persona existente
  const resColisionUpdate = await service.actualizarPersona(
    1,
    { ciNit: '7654321-SC' }, // CI de Ana Gómez
    1
  );
  assertFailure(resColisionUpdate, 'Rechaza actualización con CI perteneciente a otro usuario');
  assertTest(resColisionUpdate.statusCode === 409, 'Retorna 409 Conflict');

  // ==========================================================================
  // Test 7: CA6 - Asignación de unidad (departamento) como Propietario
  // ==========================================================================
  console.log('\n7️⃣ [CA6] Asignación a departamento como Propietario');
  const resAsignacionProp = await service.asignarAUnidad(
    1, // Carlos Alberto
    {
      idDepartamento: 101,
      tipoOcupante: 'Propietario',
      fechaInicio: '2026-01-01',
      esPropietarioDirecto: true,
    },
    1
  );
  assertSuccess(resAsignacionProp, 'Asignación de propietario exitosa');
  assertTest(departamentosDb.find((d) => d.idDepartamento === 101).idPropietario === 1, 'Departamento 101 tiene a Carlos como titular');

  const auditAsignacion = auditRecords.find((a) => a.accion === 'ASIGNACION_UNIDAD');
  assertTest(auditAsignacion !== undefined, 'Auditoría registró ASIGNACION_UNIDAD');
  assertTest(auditAsignacion.datosNuevos.idDepartamento === 101, 'Auditoría registra depto 101');

  // ==========================================================================
  // Test 8: CA6 - Asignación como Inquilino y validación de fechas
  // ==========================================================================
  console.log('\n8️⃣ [CA6] Asignación como Inquilino y validación de coherencia de fechas');
  const resAsignacionInq = await service.asignarAUnidad(
    2, // Ana Gómez
    {
      idDepartamento: 101,
      tipoOcupante: 'Inquilino',
      fechaInicio: '2026-03-01',
    },
    1
  );
  assertSuccess(resAsignacionInq, 'Asignación de inquilino exitosa');
  assertTest(departamentosDb.find((d) => d.idDepartamento === 101).idPropietario === 1, 'Titular sigue siendo el propietario, no el inquilino');

  // Fecha fin anterior a fecha inicio
  const resFechaInvalida = await service.asignarAUnidad(
    2,
    {
      idDepartamento: 102,
      tipoOcupante: 'Inquilino',
      fechaInicio: '2026-05-01',
      fechaFin: '2026-01-01', // Antes de fechaInicio
    },
    1
  );
  assertFailure(resFechaInvalida, 'Rechaza fechaFin anterior a fechaInicio');
  assertTest(resFechaInvalida.statusCode === 400, 'Código de error 400');

  // ==========================================================================
  // Test 9: CA7 - Finalización de ocupación e historial
  // ==========================================================================
  console.log('\n9️⃣ [CA7] Finalización de ocupación activa y consulta de historial');
  const resFinalizar = await service.finalizarOcupacion(
    resAsignacionInq.data.idOcupacion,
    '2026-08-31',
    1
  );
  assertSuccess(resFinalizar, 'Ocupación finalizada exitosamente');

  const auditFin = auditRecords.find((a) => a.accion === 'FINALIZACION_OCUPACION');
  assertTest(auditFin !== undefined, 'Auditoría registró FINALIZACION_OCUPACION');

  // Intento de finalizar una ocupación que ya concluyó
  const resFinalizarDoble = await service.finalizarOcupacion(
    resAsignacionInq.data.idOcupacion,
    '2026-09-01',
    1
  );
  assertFailure(resFinalizarDoble, 'Rechaza finalizar ocupación ya cerrada');
  assertTest(resFinalizarDoble.error === 'OCUPACION_YA_FINALIZADA', 'Error OCUPACION_YA_FINALIZADA');

  // Historial de la persona
  const historialPersona = await service.obtenerHistorialPersona(2);
  assertSuccess(historialPersona, 'Consulta de historial por persona exitosa');
  assertTest(historialPersona.data.historialOcupaciones.length === 1, 'Historial contiene 1 registro');

  // Historial del departamento
  const historialDepto = await service.obtenerHistorialDepartamento(101);
  assertSuccess(historialDepto, 'Consulta de historial por depto exitosa');
  assertTest(historialDepto.data.historialOcupantes.length === 2, 'Departamento 101 tiene 2 registros históricos (propietario + inquilino)');

  console.log('\n====================================================================');
  console.log(`🎉 RESULTADO: ${passedTests}/${totalTests} pruebas pasaron exitosamente.`);
  console.log('====================================================================\n');
}

runUnitTests().catch((err) => {
  console.error('💥 Error inesperado durante las pruebas:', err);
  process.exit(1);
});

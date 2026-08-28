// packages/database/prisma/seed.ts
// Script de población inicial de datos (seed)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos Edificio XYZ...');

  // 1. Roles
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema de administración',
    },
  });

  const rolDirectorio = await prisma.rol.upsert({
    where: { nombre: 'Directorio' },
    update: {},
    create: {
      nombre: 'Directorio',
      descripcion: 'Acceso a reportes, finanzas y aprobaciones',
    },
  });

  const rolConsulta = await prisma.rol.upsert({
    where: { nombre: 'Consulta' },
    update: {},
    create: {
      nombre: 'Consulta',
      descripcion: 'Solo lectura de avisos y estados de cuenta',
    },
  });

  // 2. Usuarios Iniciales
  const hashAdmin = await bcrypt.hash('admin123', 10);
  const hashDirectorio = await bcrypt.hash('directorio123', 10);
  const hashConsulta = await bcrypt.hash('consulta123', 10);

  const adminUser = await prisma.usuario.upsert({
    where: { correo: 'admin@edificioxyz.com' },
    update: { passwordHash: hashAdmin },
    create: {
      nombreUsuario: 'admin',
      correo: 'admin@edificioxyz.com',
      passwordHash: hashAdmin,
      idRol: rolAdmin.idRol,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'directorio@edificioxyz.com' },
    update: { passwordHash: hashDirectorio },
    create: {
      nombreUsuario: 'directorio',
      correo: 'directorio@edificioxyz.com',
      passwordHash: hashDirectorio,
      idRol: rolDirectorio.idRol,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'consulta@edificioxyz.com' },
    update: { passwordHash: hashConsulta },
    create: {
      nombreUsuario: 'consulta',
      correo: 'consulta@edificioxyz.com',
      passwordHash: hashConsulta,
      idRol: rolConsulta.idRol,
      activo: true,
    },
  });

  // 3. Categorías de Movimiento
  const categorias = [
    { nombre: 'Expensas ordinarias', tipo: 'Ingreso' },
    { nombre: 'Ingresos extraordinarios', tipo: 'Ingreso' },
    { nombre: 'Mantenimiento y reparaciones', tipo: 'Egreso' },
    { nombre: 'Servicios básicos (Agua/Luz/Gas)', tipo: 'Egreso' },
    { nombre: 'Salarios y Beneficios', tipo: 'Egreso' },
    { nombre: 'Insumos de limpieza y seguridad', tipo: 'Egreso' },
  ];

  for (const cat of categorias) {
    const existing = await prisma.categoriaMovimiento.findFirst({
      where: { nombre: cat.nombre },
    });
    if (!existing) {
      await prisma.categoriaMovimiento.create({ data: cat });
    }
  }

  // 4. Cuentas Bancarias
  const existingCuenta = await prisma.cuentaBancaria.findFirst({
    where: { numeroCuenta: '401-2093849-01' },
  });

  let cuentaBancariaId = existingCuenta?.idCuenta;
  if (!existingCuenta) {
    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        banco: 'Banco Mercantil Santa Cruz',
        numeroCuenta: '401-2093849-01',
        tipoCuenta: 'Cuenta Corriente',
        saldoActual: 28450.0,
      },
    });
    cuentaBancariaId = cuenta.idCuenta;
  }

  // 5. Copropietarios (Personas)
  const p1 = await prisma.persona.upsert({
    where: { ciNit: '4920194' },
    update: {},
    create: {
      nombres: 'Carlos Andrés',
      apellidos: 'Mendoza Vargas',
      ciNit: '4920194',
      telefono: '+591 76543210',
      correo: 'carlos.mendoza@gmail.com',
      direccion: 'Av. Las Palmas #450',
    },
  });

  const p2 = await prisma.persona.upsert({
    where: { ciNit: '8392011' },
    update: {},
    create: {
      nombres: 'Mariana Sofia',
      apellidos: 'Fernandez Rios',
      ciNit: '8392011',
      telefono: '+591 71239845',
      correo: 'mariana.fernandez@outlook.com',
    },
  });

  const p3 = await prisma.persona.upsert({
    where: { ciNit: '3490281' },
    update: {},
    create: {
      nombres: 'Roberto',
      apellidos: 'Gutiérrez Salazar',
      ciNit: '3490281',
      telefono: '+591 79841234',
      correo: 'roberto.gutierrez@empresa.com',
    },
  });

  // 6. Departamentos
  const d101 = await prisma.departamento.upsert({
    where: { numero: '101' },
    update: {},
    create: {
      numero: '101',
      piso: 1,
      areaM2: 85.5,
      idPropietario: p1.idPersona,
      estado: 'Ocupado',
    },
  });

  const d102 = await prisma.departamento.upsert({
    where: { numero: '102' },
    update: {},
    create: {
      numero: '102',
      piso: 1,
      areaM2: 92.0,
      idPropietario: p2.idPersona,
      estado: 'Ocupado',
    },
  });

  const d201 = await prisma.departamento.upsert({
    where: { numero: '201' },
    update: {},
    create: {
      numero: '201',
      piso: 2,
      areaM2: 120.0,
      idPropietario: p3.idPersona,
      estado: 'Ocupado',
    },
  });

  const d202 = await prisma.departamento.upsert({
    where: { numero: '202' },
    update: {},
    create: {
      numero: '202',
      piso: 2,
      areaM2: 88.0,
      estado: 'Desocupado',
    },
  });

  // Parqueos y Bauleras
  await prisma.parqueo.upsert({
    where: { numero: 'P-01' },
    update: {},
    create: { numero: 'P-01', idDepartamento: d101.idDepartamento },
  });
  await prisma.parqueo.upsert({
    where: { numero: 'P-02' },
    update: {},
    create: { numero: 'P-02', idDepartamento: d102.idDepartamento },
  });
  await prisma.baulera.upsert({
    where: { numero: 'B-01' },
    update: {},
    create: { numero: 'B-01', idDepartamento: d101.idDepartamento },
  });

  // 7. Expensas
  const mesActual = new Date();
  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const fechaVenc = new Date(mesActual.getFullYear(), mesActual.getMonth(), 15);

  const mesPasado = new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1);
  const fechaVencPasado = new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 15);

  await prisma.expensa.upsert({
    where: {
      idDepartamento_periodo: {
        idDepartamento: d101.idDepartamento,
        periodo: primerDiaMes,
      },
    },
    update: {},
    create: {
      idDepartamento: d101.idDepartamento,
      periodo: primerDiaMes,
      monto: 450.0,
      saldoPendiente: 0,
      estado: 'Pagado',
      fechaVencimiento: fechaVenc,
    },
  });

  await prisma.expensa.upsert({
    where: {
      idDepartamento_periodo: {
        idDepartamento: d102.idDepartamento,
        periodo: primerDiaMes,
      },
    },
    update: {},
    create: {
      idDepartamento: d102.idDepartamento,
      periodo: primerDiaMes,
      monto: 480.0,
      saldoPendiente: 480.0,
      estado: 'Pendiente',
      fechaVencimiento: fechaVenc,
    },
  });

  await prisma.expensa.upsert({
    where: {
      idDepartamento_periodo: {
        idDepartamento: d201.idDepartamento,
        periodo: mesPasado,
      },
    },
    update: {},
    create: {
      idDepartamento: d201.idDepartamento,
      periodo: mesPasado,
      monto: 600.0,
      saldoPendiente: 600.0,
      tasaInteresMora: 3.5,
      estado: 'Moroso',
      fechaVencimiento: fechaVencPasado,
    },
  });

  // 8. Comunicados
  const com1 = await prisma.comunicado.findFirst({
    where: { titulo: 'Mantenimiento Preventivo de Ascensores' },
  });
  if (!com1) {
    await prisma.comunicado.create({
      data: {
        titulo: 'Mantenimiento Preventivo de Ascensores',
        contenido:
          'Se informa a todos los copropietarios y residentes que el día sábado de 09:00 a 13:00 se realizará el servicio preventivo bimestral del ascensor principal. Agradecemos su comprensión.',
        canalEnvio: 'Ambos',
        idUsuarioCreador: adminUser.idUsuario,
      },
    });
  }

  // 9. Empleados
  const emp1 = await prisma.empleado.upsert({
    where: { ci: '5829103' },
    update: {},
    create: {
      nombres: 'Juan Carlos',
      apellidos: 'Mamani Torrico',
      ci: '5829103',
      cargo: 'Conserje y Mantenimiento',
      salarioBase: 2750.0,
      fechaIngreso: new Date('2023-03-01'),
      activo: true,
    },
  });

  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// apps/web/app/api/v1/health/route.ts
// Endpoint de salud y conectividad de base de datos

import { NextResponse } from 'next/server';
import { prisma } from '@edificio-xyz/database';

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    return NextResponse.json({
      status: 'OK',
      message: 'Sistema de Administración Edificio XYZ - API Activa (Next.js + Prisma)',
      db_time: result[0]?.now,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'ERROR', message: 'Error de conexión a la BD', error: String(error) },
      { status: 500 }
    );
  }
}

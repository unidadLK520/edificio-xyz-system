// frontend/app/api/v1/[...path]/route.ts
// Proxy dinámico para todas las peticiones a la API v1 del backend Express

import { NextResponse, type NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1'

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  let targetPath = ''
  let targetUrl = ''
  let body: any = null

  try {
    const resolvedParams = await params
    const pathSegments = resolvedParams.path || []
    targetPath = pathSegments.join('/')
    targetUrl = `${BACKEND_URL}/${targetPath}${request.nextUrl.search}`

    // Extraer token de autorización (cookie o header Bearer)
    let token = request.cookies.get('auth_token')?.value
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const clientIp =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    if (clientIp) headers['x-forwarded-for'] = clientIp

    const userAgent = request.headers.get('user-agent') || ''
    if (userAgent) headers['user-agent'] = userAgent

    const contentType = request.headers.get('content-type')
    if (contentType) headers['Content-Type'] = contentType

    let body: any = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text()
    }

    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined
    })

    const data = await backendRes.text()
    let jsonOrText: any
    try {
      jsonOrText = JSON.parse(data)
    } catch {
      jsonOrText = data
    }

    if (typeof jsonOrText === 'string') {
      return new NextResponse(jsonOrText, {
        status: backendRes.status,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    return NextResponse.json(jsonOrText, { status: backendRes.status })
  } catch (err: any) {
    console.warn(
      `[Proxy API v1] Backend no disponible en ${targetUrl}. Ejecutando fallback local:`,
      err.message
    )

    // Fallback inteligente para endpoints de desarrollo frontend
    if (targetPath.startsWith('usuarios')) {
      if (request.method === 'GET') {
        return NextResponse.json([
          {
            idUsuario: 1,
            nombreUsuario: 'admin',
            correo: 'admin@edificioxyz.com',
            activo: true,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: new Date().toISOString(),
            idPersona: 1,
            rol: { idRol: 1, nombre: 'ADMINISTRADOR', descripcion: 'Control total del sistema' },
            persona: {
              idPersona: 1,
              nombres: 'Carlos',
              apellidos: 'Mendoza Torrico',
              ciNit: '4829104-LP',
              telefono: '+591 71234567',
              correo: 'admin@edificioxyz.com',
              direccion: 'Av. Ballivián 1234, Edificio XYZ, Piso 8'
            }
          },
          {
            idUsuario: 2,
            nombreUsuario: 'directorio',
            correo: 'directorio@edificioxyz.com',
            activo: true,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: new Date().toISOString(),
            idPersona: 2,
            rol: { idRol: 2, nombre: 'DIRECTORIO', descripcion: 'Fiscalización y reportes' },
            persona: {
              idPersona: 2,
              nombres: 'Patricia',
              apellidos: 'Vargas Quiroga',
              ciNit: '3920194-CB',
              telefono: '+591 79876543',
              correo: 'directorio@edificioxyz.com',
              direccion: 'Calle Jordan 456'
            }
          },
          {
            idUsuario: 3,
            nombreUsuario: 'residente',
            correo: 'residente@edificioxyz.com',
            activo: true,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: new Date().toISOString(),
            idPersona: 3,
            rol: { idRol: 3, nombre: 'COPROPIETARIO', descripcion: 'Propietario residente' },
            persona: {
              idPersona: 3,
              nombres: 'Alejandro',
              apellidos: 'Gómez Salces',
              ciNit: '6192834-SC',
              telefono: '+591 60123987',
              correo: 'residente@edificioxyz.com',
              direccion: 'Dpto 4B, Edificio XYZ'
            }
          },
          {
            idUsuario: 4,
            nombreUsuario: 'auditor',
            correo: 'consulta@edificioxyz.com',
            activo: false,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: null,
            idPersona: 4,
            rol: { idRol: 4, nombre: 'CONSULTA', descripcion: 'Auditoría externa' },
            persona: {
              idPersona: 4,
              nombres: 'Martín',
              apellidos: 'Suárez Flores',
              ciNit: '5192843-LP',
              telefono: '+591 77334455',
              correo: 'consulta@edificioxyz.com',
              direccion: 'Zona Sur, Calle 21'
            }
          }
        ])
      }

      if (request.method === 'POST') {
        let parsed: any = {}
        try {
          parsed = JSON.parse(body)
        } catch {}
        return NextResponse.json(
          {
            idUsuario: Date.now(),
            nombreUsuario: parsed.nombreUsuario || 'nuevo_usuario',
            correo: parsed.correo || 'nuevo@edificioxyz.com',
            rol: parsed.rol || 'ADMINISTRADOR',
            activo: parsed.activo ?? true,
            persona: parsed.persona || null
          },
          { status: 201 }
        )
      }

      if (request.method === 'PATCH') {
        return NextResponse.json({
          success: true,
          message: 'Actualizado exitosamente (modo local)'
        })
      }
    }

    if (targetPath.startsWith('auditoria')) {
      return NextResponse.json([
        {
          id: 'AUD-9021',
          fechaHora: '2026-09-18 21:45:12',
          usuario: 'Carlos Administrador',
          correo: 'admin@edificioxyz.com',
          rol: 'Administrador',
          modulo: 'Copropietarios',
          accion: 'CREACION',
          severidad: 'INFO',
          descripcion: 'Registro de nuevo residente e inquilino en Dpto 301.',
          ip: '192.168.1.45 (Cochabamba, BO)',
          detallesCambio: {
            entidad: 'Copropietario',
            idRegistro: 'RES-105',
            camposModificados: [
              { campo: 'Nombre', antes: '— (Nuevo)', despues: 'Gabriel Romero Soria' },
              { campo: 'Departamento', antes: '—', despues: 'Dpto 301 (Piso 3)' },
              { campo: 'Parqueo', antes: '—', despues: 'P-08' },
              { campo: 'Estado', antes: '—', despues: 'Activo' }
            ]
          }
        },
        {
          id: 'AUD-9020',
          fechaHora: '2026-09-18 20:12:05',
          usuario: 'Mesa Directiva',
          correo: 'directorio@edificioxyz.com',
          rol: 'Directorio',
          modulo: 'Finanzas',
          accion: 'MODIFICACION',
          severidad: 'ADVERTENCIA',
          descripcion: 'Aprobación y conciliación de gasto por mantenimiento de ascensores.',
          ip: '190.181.24.12 (Santa Cruz, BO)',
          detallesCambio: {
            entidad: 'Gasto / Egreso',
            idRegistro: 'EGR-412',
            camposModificados: [
              { campo: 'Estado Conciliación', antes: 'Pendiente', despues: 'Aprobado' },
              { campo: 'Monto Aprobado', antes: 'Bs. 0.00', despues: 'Bs. 3,500.00' },
              { campo: 'Aprobado Por', antes: 'Ninguno', despues: 'Directorio Finanzas' }
            ]
          }
        },
        {
          id: 'AUD-9019',
          fechaHora: '2026-09-18 19:30:44',
          usuario: 'Sistema Automático',
          correo: 'cron@edificioxyz.com',
          rol: 'Sistema',
          modulo: 'Expensas',
          accion: 'CREACION',
          severidad: 'INFO',
          descripcion: 'Generación automática del lote mensual de expensas período vigente.',
          ip: 'Servidor Central AWS sa-east-1',
          detallesCambio: {
            entidad: 'Lote Expensas',
            idRegistro: 'EXP-2026-09',
            camposModificados: [
              { campo: 'Total Unidades Emitidas', antes: '0', despues: '24 Departamentos' },
              { campo: 'Total Facturación', antes: 'Bs. 0.00', despues: 'Bs. 12,480.00' }
            ]
          }
        },
        {
          id: 'AUD-9018',
          fechaHora: '2026-09-18 18:05:19',
          usuario: 'Carlos Administrador',
          correo: 'admin@edificioxyz.com',
          rol: 'Administrador',
          modulo: 'Seguridad/Roles',
          accion: 'LOGIN',
          severidad: 'INFO',
          descripcion: 'Inicio de sesión exitoso mediante credenciales JWT.',
          ip: '192.168.1.45 (Cochabamba, BO)'
        },
        {
          id: 'AUD-9017',
          fechaHora: '2026-09-18 17:42:30',
          usuario: 'Intento Desconocido',
          correo: 'root@edificioxyz.com',
          rol: 'No Autenticado',
          modulo: 'Seguridad/Roles',
          accion: 'LOGIN',
          severidad: 'CRITICO',
          descripcion: 'Intento fallido de autenticación. Contraseña incorrecta rechazada.',
          ip: '185.220.101.5 (IP Bloqueada preventivamente)'
        }
      ])
    }

    if (targetPath.startsWith('copropietarios') || targetPath.startsWith('residentes')) {
      return NextResponse.json([
        {
          id: 1,
          nombreCompleto: 'Carlos Mendoza Rojas',
          ci: '4829103 CBBA',
          tipo: 'Propietario',
          deptoNumero: '101',
          piso: 1,
          parqueo: 'P-01',
          baulera: 'B-01',
          telefono: '+591 71234567',
          correo: 'carlos.mendoza@email.com',
          fechaIngreso: '2023-01-15',
          estado: 'Activo'
        },
        {
          id: 2,
          nombreCompleto: 'Mariana Flores Soliz',
          ci: '5920144 SCZ',
          tipo: 'Inquilino',
          deptoNumero: '102',
          piso: 1,
          parqueo: 'P-02',
          baulera: 'Sin baulera',
          telefono: '+591 79876543',
          correo: 'mariana.flores@email.com',
          fechaIngreso: '2024-03-01',
          estado: 'Activo'
        }
      ])
    }

    if (targetPath.startsWith('health')) {
      return NextResponse.json({
        status: 'OK',
        message: 'API Next.js Activa (Modo Local Frontend)'
      })
    }

    return NextResponse.json(
      { error: 'Backend Connection Error', message: err.message },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx)
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx)
}

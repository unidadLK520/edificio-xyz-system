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
    if (targetPath.startsWith('departamentos')) {
      if (request.method === 'GET') {
        return NextResponse.json({
          data: [
            {
              idDepartamento: 1,
              numero: '101',
              piso: 1,
              areaM2: 110.5,
              alicuota: 4.16,
              estado: 'Ocupado',
              parqueo: 'P-01 (Subsuelo 1)',
              baulera: 'B-01',
              idPersonaPropietario: 1,
              propietario: {
                idPersona: 1,
                nombres: 'Carlos',
                apellidos: 'Mendoza Rojas',
                ciNit: '4829103 CBBA',
                telefono: '+591 71234567',
                correo: 'carlos.mendoza@email.com'
              },
              ocupaciones: [
                {
                  idOcupacion: 1,
                  tipoOcupante: 'Propietario',
                  fechaInicio: '2023-01-15',
                  persona: {
                    nombres: 'Carlos',
                    apellidos: 'Mendoza Rojas',
                    telefono: '+591 71234567'
                  }
                }
              ]
            },
            {
              idDepartamento: 2,
              numero: '102',
              piso: 1,
              areaM2: 85.0,
              alicuota: 3.2,
              estado: 'Ocupado',
              parqueo: 'P-02 (Subsuelo 1)',
              baulera: 'Sin baulera',
              idPersonaPropietario: 2,
              propietario: {
                idPersona: 2,
                nombres: 'Mariana',
                apellidos: 'Flores Soliz',
                ciNit: '5920144 SCZ',
                telefono: '+591 79876543',
                correo: 'mariana.flores@email.com'
              },
              ocupaciones: [
                {
                  idOcupacion: 2,
                  tipoOcupante: 'Inquilino',
                  fechaInicio: '2024-03-01',
                  persona: { nombres: 'Roberto', apellidos: 'Gómez', telefono: '+591 70123456' }
                }
              ]
            },
            {
              idDepartamento: 3,
              numero: '201',
              piso: 2,
              areaM2: 125.0,
              alicuota: 4.71,
              estado: 'Ocupado',
              parqueo: 'P-05 (Subsuelo 2)',
              baulera: 'B-03',
              idPersonaPropietario: 3,
              propietario: {
                idPersona: 3,
                nombres: 'Alejandro',
                apellidos: 'Vargas Morales',
                ciNit: '3948120 LPZ',
                telefono: '+591 67123980',
                correo: 'alejandro.vargas@email.com'
              },
              ocupaciones: [
                {
                  idOcupacion: 3,
                  tipoOcupante: 'Propietario',
                  fechaInicio: '2022-06-10',
                  persona: {
                    nombres: 'Alejandro',
                    apellidos: 'Vargas Morales',
                    telefono: '+591 67123980'
                  }
                }
              ]
            },
            {
              idDepartamento: 4,
              numero: '202',
              piso: 2,
              areaM2: 95.0,
              alicuota: 3.58,
              estado: 'Disponible',
              parqueo: 'Sin parqueo',
              baulera: 'B-04',
              idPersonaPropietario: 4,
              propietario: {
                idPersona: 4,
                nombres: 'Valeria',
                apellidos: 'Torrico Camacho',
                ciNit: '6129841 CBBA',
                telefono: '+591 75432198',
                correo: 'valeria.torrico@email.com'
              },
              ocupaciones: []
            },
            {
              idDepartamento: 5,
              numero: '301',
              piso: 3,
              areaM2: 140.0,
              alicuota: 5.28,
              estado: 'En Alquiler',
              parqueo: 'P-08 (Subsuelo 1)',
              baulera: 'B-07',
              idPersonaPropietario: 5,
              propietario: {
                idPersona: 5,
                nombres: 'Fernando',
                apellidos: 'Castro Ortiz',
                ciNit: '4918230 CBBA',
                telefono: '+591 72198450',
                correo: 'fernando.castro@email.com'
              },
              ocupaciones: []
            },
            {
              idDepartamento: 6,
              numero: '302',
              piso: 3,
              areaM2: 88.5,
              alicuota: 3.34,
              estado: 'Mantenimiento',
              parqueo: 'Sin parqueo',
              baulera: 'Sin baulera',
              idPersonaPropietario: null,
              propietario: null,
              ocupaciones: []
            }
          ],
          meta: {
            total: 6,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        })
      }

      if (request.method === 'POST') {
        let parsed: any = {}
        try {
          parsed = JSON.parse(body)
        } catch {}
        return NextResponse.json(
          {
            idDepartamento: Date.now(),
            numero: parsed.numero || '100',
            piso: parsed.piso || 1,
            areaM2: parsed.areaM2 || 100,
            alicuota: parsed.alicuota || 4.0,
            estado: parsed.estado || 'Disponible',
            parqueo: parsed.parqueo || 'Sin parqueo',
            baulera: parsed.baulera || 'Sin baulera',
            propietario: parsed.propietario || null
          },
          { status: 201 }
        )
      }

      if (request.method === 'PATCH' || request.method === 'PUT') {
        return NextResponse.json({
          success: true,
          message: 'Departamento actualizado exitosamente (modo local)'
        })
      }
    }

    if (targetPath.startsWith('personas')) {
      return NextResponse.json({
        data: [
          {
            idPersona: 1,
            ciNit: '4829103 CBBA',
            nombres: 'Carlos',
            apellidos: 'Mendoza Rojas',
            telefono: '+591 71234567',
            correo: 'carlos.mendoza@email.com',
            direccion: 'Av. Ballivián 1234',
            departamentosPropios: [{ idDepartamento: 1, numero: '101' }],
            ocupaciones: [
              { idOcupacion: 1, tipoOcupante: 'Propietario', departamento: { numero: '101' } }
            ]
          },
          {
            idPersona: 2,
            ciNit: '5920144 SCZ',
            nombres: 'Mariana',
            apellidos: 'Flores Soliz',
            telefono: '+591 79876543',
            correo: 'mariana.flores@email.com',
            direccion: 'Calle Sucre 456',
            departamentosPropios: [{ idDepartamento: 2, numero: '102' }],
            ocupaciones: [
              { idOcupacion: 2, tipoOcupante: 'Inquilino', departamento: { numero: '102' } }
            ]
          },
          {
            idPersona: 3,
            ciNit: '3948120 LPZ',
            nombres: 'Alejandro',
            apellidos: 'Vargas Morales',
            telefono: '+591 67123980',
            correo: 'alejandro.vargas@email.com',
            direccion: 'Calle España 789',
            departamentosPropios: [{ idDepartamento: 3, numero: '201' }],
            ocupaciones: [
              { idOcupacion: 3, tipoOcupante: 'Propietario', departamento: { numero: '201' } }
            ]
          },
          {
            idPersona: 4,
            ciNit: '6129841 CBBA',
            nombres: 'Valeria',
            apellidos: 'Torrico Camacho',
            telefono: '+591 75432198',
            correo: 'valeria.torrico@email.com',
            direccion: 'Av. América 321',
            departamentosPropios: [{ idDepartamento: 4, numero: '202' }],
            ocupaciones: []
          }
        ],
        meta: {
          total: 4,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      })
    }

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

    if (targetPath.startsWith('movimientos')) {
      const CATEGORIAS_MOCK = [
        { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
        { idCategoria: 2, nombre: 'Servicios Básicos (Luz/Agua)', tipo: 'Egreso' },
        { idCategoria: 3, nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
        { idCategoria: 4, nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
        { idCategoria: 5, nombre: 'Administrativo y Legal', tipo: 'Egreso' },
        { idCategoria: 6, nombre: 'Ingreso Extraordinario', tipo: 'Ingreso' },
        { idCategoria: 7, nombre: 'Alquiler Áreas Comunes / Salón', tipo: 'Ingreso' },
        { idCategoria: 8, nombre: 'Multas y Penalidades', tipo: 'Ingreso' },
        { idCategoria: 9, nombre: 'Donación o Aporte Voluntario', tipo: 'Ingreso' },
        { idCategoria: 10, nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' },
      ]

      if (targetPath === 'movimientos/categorias') {
        const tipoQuery = request.nextUrl.searchParams.get('tipo')
        const filtered = tipoQuery
          ? CATEGORIAS_MOCK.filter((c) => c.tipo === tipoQuery)
          : CATEGORIAS_MOCK
        return NextResponse.json(filtered)
      }

      if (targetPath === 'movimientos/resumen') {
        return NextResponse.json({
          periodo: { mes: 'todos', anio: 'todos' },
          totalIngresos: 9350.0,
          totalEgresos: 11620.0,
          balance: -2270.0,
          cantidadIngresos: 4,
          cantidadEgresos: 5,
          porCategoria: [
            { idCategoria: 1, tipo: 'Egreso', _sum: { monto: 4120.0 }, _count: 2 },
            { idCategoria: 2, tipo: 'Egreso', _sum: { monto: 2450.0 }, _count: 1 },
            { idCategoria: 3, tipo: 'Egreso', _sum: { monto: 4200.0 }, _count: 1 },
            { idCategoria: 4, tipo: 'Egreso', _sum: { monto: 850.0 }, _count: 1 },
            { idCategoria: 6, tipo: 'Ingreso', _sum: { monto: 5000.0 }, _count: 1 },
            { idCategoria: 7, tipo: 'Ingreso', _sum: { monto: 1800.0 }, _count: 1 },
            { idCategoria: 8, tipo: 'Ingreso', _sum: { monto: 750.0 }, _count: 1 },
            { idCategoria: 10, tipo: 'Ingreso', _sum: { monto: 1800.0 }, _count: 1 },
          ]
        })
      }

      if (request.method === 'GET') {
        const tipoParam = request.nextUrl.searchParams.get('tipo')
        const catParam = request.nextUrl.searchParams.get('idCategoria')
        const qParam = request.nextUrl.searchParams.get('q')

        let sampleMovimientos = [
          {
            idMovimiento: 1,
            tipo: 'Egreso',
            idCategoria: 1,
            monto: 3500.0,
            descripcion: 'Otis Elevadores Bolivia S.A. | Mantenimiento preventivo bimensual de ascensores torre A y B.',
            fecha: '2026-09-18T00:00:00.000Z',
            comprobanteUrl: 'FAC-90182',
            categoria: { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 2,
            tipo: 'Egreso',
            idCategoria: 2,
            monto: 2450.0,
            descripcion: 'ELFEC S.A. | Energía eléctrica de áreas comunes, bombas de agua y pasillos.',
            fecha: '2026-09-15T00:00:00.000Z',
            comprobanteUrl: 'FAC-349012',
            categoria: { idCategoria: 2, nombre: 'Servicios Básicos (Luz/Agua)', tipo: 'Egreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 3,
            tipo: 'Egreso',
            idCategoria: 3,
            monto: 4200.0,
            descripcion: 'Seguritas Integral Ltda. | Servicio de vigilancia y monitoreo 24/7 mes en curso.',
            fecha: '2026-09-14T00:00:00.000Z',
            comprobanteUrl: 'FAC-11928',
            categoria: { idCategoria: 3, nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 4,
            tipo: 'Egreso',
            idCategoria: 4,
            monto: 850.0,
            descripcion: 'Distribuidora Química del Valle | Insumos de limpieza, desinfectantes y bolsas de consorcio.',
            fecha: '2026-09-20T00:00:00.000Z',
            comprobanteUrl: 'FAC-4891',
            categoria: { idCategoria: 4, nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 5,
            tipo: 'Egreso',
            idCategoria: 1,
            monto: 620.0,
            descripcion: 'Plomería & Bombas Express | Reparación de válvula de presión en tanque subterráneo.',
            fecha: '2026-09-21T00:00:00.000Z',
            comprobanteUrl: 'REC-0982',
            categoria: { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 6,
            tipo: 'Ingreso',
            idCategoria: 6,
            monto: 5000.0,
            descripcion: 'Comunidad de Copropietarios | Cuota extraordinaria para impermeabilización de azotea.',
            fecha: '2026-09-19T00:00:00.000Z',
            comprobanteUrl: 'REC-EXT-001',
            categoria: { idCategoria: 6, nombre: 'Ingreso Extraordinario', tipo: 'Ingreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 7,
            tipo: 'Ingreso',
            idCategoria: 7,
            monto: 1800.0,
            descripcion: 'Sra. Mariana Flores (Dpto 302) | Alquiler del Salón de Eventos y Churrasquera fin de semana.',
            fecha: '2026-09-16T00:00:00.000Z',
            comprobanteUrl: 'REC-SALON-44',
            categoria: { idCategoria: 7, nombre: 'Alquiler Áreas Comunes / Salón', tipo: 'Ingreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 8,
            tipo: 'Ingreso',
            idCategoria: 8,
            monto: 750.0,
            descripcion: 'Dpto 204 | Cobro de multa por ruidos molestos reiterados fuera de horario reglamentario.',
            fecha: '2026-09-12T00:00:00.000Z',
            comprobanteUrl: 'BOL-MULTA-12',
            categoria: { idCategoria: 8, nombre: 'Multas y Penalidades', tipo: 'Ingreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          {
            idMovimiento: 9,
            tipo: 'Ingreso',
            idCategoria: 10,
            monto: 1800.0,
            descripcion: 'Banco Mercantil Santa Cruz | Rendimiento por intereses de depósito a plazo fijo fondo de reserva.',
            fecha: '2026-09-10T00:00:00.000Z',
            comprobanteUrl: 'BMSC-INT-0926',
            categoria: { idCategoria: 10, nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' },
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          }
        ]

        if (tipoParam && tipoParam !== 'Todos') {
          sampleMovimientos = sampleMovimientos.filter((m) => m.tipo === tipoParam)
        }
        if (catParam && catParam !== 'Todos') {
          sampleMovimientos = sampleMovimientos.filter((m) => m.idCategoria === parseInt(catParam))
        }
        if (qParam) {
          const qLower = qParam.toLowerCase()
          sampleMovimientos = sampleMovimientos.filter(
            (m) =>
              m.descripcion.toLowerCase().includes(qLower) ||
              (m.comprobanteUrl && m.comprobanteUrl.toLowerCase().includes(qLower))
          )
        }

        return NextResponse.json({
          data: sampleMovimientos,
          meta: {
            total: sampleMovimientos.length,
            page: 1,
            limit: 50,
            totalPages: 1
          }
        })
      }

      if (request.method === 'POST') {
        let parsed: any = {}
        try {
          parsed = JSON.parse(body)
        } catch {}
        const catId = Number(parsed.idCategoria) || (parsed.tipo === 'Ingreso' ? 6 : 1)
        const matchedCat = CATEGORIAS_MOCK.find((c) => c.idCategoria === catId) || {
          idCategoria: catId,
          nombre: parsed.tipo === 'Ingreso' ? 'Ingreso General' : 'Gasto General',
          tipo: parsed.tipo || 'Egreso'
        }

        return NextResponse.json(
          {
            idMovimiento: Date.now(),
            tipo: parsed.tipo || 'Egreso',
            idCategoria: catId,
            monto: Number(parsed.monto) || 0,
            descripcion: parsed.descripcion || 'Sin descripción',
            fecha: parsed.fecha ? new Date(parsed.fecha).toISOString() : new Date().toISOString(),
            comprobanteUrl: parsed.comprobanteUrl || null,
            categoria: matchedCat,
            usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
          },
          { status: 201 }
        )
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        let parsed: any = {}
        try {
          parsed = JSON.parse(body)
        } catch {}
        const catId = parsed.idCategoria ? Number(parsed.idCategoria) : 1
        const matchedCat = CATEGORIAS_MOCK.find((c) => c.idCategoria === catId)

        return NextResponse.json({
          idMovimiento: Date.now(),
          ...parsed,
          monto: Number(parsed.monto || 0),
          categoria: matchedCat || { idCategoria: catId, nombre: 'Categoría', tipo: parsed.tipo || 'Egreso' },
          usuarioRegistro: { idUsuario: 1, nombreUsuario: 'admin' }
        })
      }

      if (request.method === 'DELETE') {
        return NextResponse.json({ success: true, message: 'Eliminado correctamente (modo local)' })
      }
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

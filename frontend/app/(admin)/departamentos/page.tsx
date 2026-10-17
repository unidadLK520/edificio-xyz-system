// frontend/app/(admin)/departamentos/page.tsx
// HU03: Módulo de Gestión de Unidades (Departamentos, Parqueos y Bauleras) y Catastro
// Modelo Edificio XYZ: 20 Departamentos (Tipos A, B y C), 20 Parqueos, 10 Bauleras

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Car,
  Box,
  Layers,
  Percent,
  CheckCircle2,
  UserCheck,
  KeyRound,
  AlertCircle,
  Sliders,
  Gauge
} from 'lucide-react'
import { UnidadItem, DepartamentoFormData, TipoUnidad, TipoDepartamentoItem, DEFAULT_TIPOS_DEPARTAMENTO } from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'
import AsignarUnidadModal from '@/components/departamentos/AsignarUnidadModal'
import ParametrosDepartamentosTab from '@/components/departamentos/ParametrosDepartamentosTab'
import TiposDepartamentosTab from '@/components/departamentos/TiposDepartamentosTab'

// Semilla basada en el modelo administrativo real de 20 departamentos (1,600 m² totales)
const UNIDADES_SEED: UnidadItem[] = [
  // Piso 1
  {
    id: 1,
    tipoUnidad: 'Departamento',
    numero: '101',
    piso: 1,
    areaM2: 60.0,
    tipologia: 'Tipo A (60 m²)',
    alicuota: 3.75,
    estado: 'Alquilado',
    propietario: { id: 1, nombre: 'Ana Valdivia Morales', ci: '4829103 CBBA', telefono: '+591 71234567', correo: 'ana.valdivia@email.com' },
    inquilinoActual: { id: 101, nombre: 'Pedro Ramírez Soto', telefono: '+591 79876543' },
    parqueo: 'P-01',
    baulera: 'B-01',
    fechaRegistro: '2023-01-15'
  },
  {
    id: 2,
    tipoUnidad: 'Departamento',
    numero: '102',
    piso: 1,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 2, nombre: 'Carlos Mendoza Rojas', ci: '5920144 SCZ', telefono: '+591 79876543', correo: 'carlos.mendoza@email.com' },
    inquilinoActual: { id: 102, nombre: 'María Fernández Arce', telefono: '+591 67123980' },
    parqueo: 'P-02',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-01'
  },
  {
    id: 3,
    tipoUnidad: 'Departamento',
    numero: '103',
    piso: 1,
    areaM2: 100.0,
    tipologia: 'Tipo C (100 m²)',
    alicuota: 6.25,
    estado: 'Desocupado',
    propietario: { id: 3, nombre: 'Laura Céspedes Villarroel', ci: '3948120 LPZ', telefono: '+591 67123980', correo: 'laura.cespedes@email.com' },
    inquilinoActual: null,
    parqueo: 'P-03',
    baulera: 'B-02',
    fechaRegistro: '2023-01-20'
  },
  {
    id: 4,
    tipoUnidad: 'Departamento',
    numero: '104',
    piso: 1,
    areaM2: 60.0,
    tipologia: 'Tipo A (60 m²)',
    alicuota: 3.75,
    estado: 'Alquilado',
    propietario: { id: 4, nombre: 'José Vargas Quiroga', ci: '6129841 CBBA', telefono: '+591 75432198', correo: 'jose.vargas@email.com' },
    inquilinoActual: { id: 104, nombre: 'Roberto Daza Méndez', telefono: '+591 76543210' },
    parqueo: 'P-04',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-03-01'
  },
  {
    id: 5,
    tipoUnidad: 'Departamento',
    numero: '105',
    piso: 1,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Desocupado',
    propietario: { id: 5, nombre: 'Sofía Romero Paz', ci: '4918230 CBBA', telefono: '+591 72198450', correo: 'sofia.romero@email.com' },
    inquilinoActual: null,
    parqueo: 'Sin parqueo',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-01-10'
  },
  // Piso 2
  {
    id: 6,
    tipoUnidad: 'Departamento',
    numero: '201',
    piso: 2,
    areaM2: 60.0,
    tipologia: 'Tipo A (60 m²)',
    alicuota: 3.75,
    estado: 'Ocupado por Propietario',
    propietario: { id: 6, nombre: 'Gabriel Romero Soria', ci: '4829104 LPZ', telefono: '+591 71239988', correo: 'gabriel.romero@email.com' },
    inquilinoActual: null,
    parqueo: 'P-05',
    baulera: 'B-03',
    fechaRegistro: '2023-02-15'
  },
  {
    id: 7,
    tipoUnidad: 'Departamento',
    numero: '202',
    piso: 2,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 7, nombre: 'Patricia Quiroga Daza', ci: '3920194 CBBA', telefono: '+591 79871122', correo: 'patricia.quiroga@email.com' },
    inquilinoActual: { id: 105, nombre: 'Martín Suárez Flores', telefono: '+591 77334455' },
    parqueo: 'P-06',
    baulera: 'B-04',
    fechaRegistro: '2023-01-18'
  },
  {
    id: 8,
    tipoUnidad: 'Departamento',
    numero: '203',
    piso: 2,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 8, nombre: 'Diego Claros Torrico', ci: '5192843 CBBA', telefono: '+591 60123456', correo: 'diego.claros@email.com' },
    inquilinoActual: { id: 106, nombre: 'Andrea Mercado Bellot', telefono: '+591 71987654' },
    parqueo: 'P-07',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-03-10'
  },
  {
    id: 9,
    tipoUnidad: 'Departamento',
    numero: '204',
    piso: 2,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Ocupado por Propietario',
    propietario: { id: 9, nombre: 'Alejandro Gómez Salces', ci: '6192834 SCZ', telefono: '+591 60123987', correo: 'alejandro.gomez@email.com' },
    inquilinoActual: null,
    parqueo: 'P-08',
    baulera: 'B-05',
    fechaRegistro: '2023-01-25'
  },
  {
    id: 10,
    tipoUnidad: 'Departamento',
    numero: '205',
    piso: 2,
    areaM2: 100.0,
    tipologia: 'Tipo C (100 m²)',
    alicuota: 6.25,
    estado: 'Desocupado',
    propietario: { id: 10, nombre: 'Elena Bellot Mercado', ci: '7192834 CBBA', telefono: '+591 73456789', correo: 'elena.bellot@email.com' },
    inquilinoActual: null,
    parqueo: 'P-09',
    baulera: 'B-06',
    fechaRegistro: '2023-04-01'
  },
  // Piso 3
  {
    id: 11,
    tipoUnidad: 'Departamento',
    numero: '301',
    piso: 3,
    areaM2: 60.0,
    tipologia: 'Tipo A (60 m²)',
    alicuota: 3.75,
    estado: 'Alquilado',
    propietario: { id: 11, nombre: 'Fernando Castro Ortiz', ci: '4918231 CBBA', telefono: '+591 72198451', correo: 'fernando.castro@email.com' },
    inquilinoActual: { id: 107, nombre: 'Camila Rojas Rios', telefono: '+591 74567890' },
    parqueo: 'P-10',
    baulera: 'B-07',
    fechaRegistro: '2023-01-12'
  },
  {
    id: 12,
    tipoUnidad: 'Departamento',
    numero: '302',
    piso: 3,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 12, nombre: 'Mariana Flores Soliz', ci: '5920145 SCZ', telefono: '+591 79876544', correo: 'mariana.flores@email.com' },
    inquilinoActual: { id: 108, nombre: 'Lucía Gutiérrez Daza', telefono: '+591 78901234' },
    parqueo: 'P-11',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-20'
  },
  {
    id: 13,
    tipoUnidad: 'Departamento',
    numero: '303',
    piso: 3,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 13, nombre: 'Rodrigo Heredia Zalles', ci: '8291044 CBBA', telefono: '+591 71239900', correo: 'rodrigo.heredia@email.com' },
    inquilinoActual: { id: 109, nombre: 'Gonzalo Navia Ramos', telefono: '+591 65432109' },
    parqueo: 'P-12',
    baulera: 'B-08',
    fechaRegistro: '2023-01-30'
  },
  {
    id: 14,
    tipoUnidad: 'Departamento',
    numero: '304',
    piso: 3,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Desocupado',
    propietario: { id: 14, nombre: 'Beatriz Salazar Camacho', ci: '9182045 LPZ', telefono: '+591 70123456', correo: 'beatriz.salazar@email.com' },
    inquilinoActual: null,
    parqueo: 'P-13',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-03-05'
  },
  {
    id: 15,
    tipoUnidad: 'Departamento',
    numero: '305',
    piso: 3,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Alquilado',
    propietario: { id: 15, nombre: 'Juan Pérez Montaño', ci: '3819204 CBBA', telefono: '+591 76543219', correo: 'juan.perez@email.com' },
    inquilinoActual: { id: 110, nombre: 'María López Arteaga', telefono: '+591 79123456' },
    parqueo: 'P-14',
    baulera: 'B-09',
    fechaRegistro: '2023-01-15'
  },
  // Piso 4
  {
    id: 16,
    tipoUnidad: 'Departamento',
    numero: '401',
    piso: 4,
    areaM2: 60.0,
    tipologia: 'Tipo A (60 m²)',
    alicuota: 3.75,
    estado: 'Ocupado por Propietario',
    propietario: { id: 16, nombre: 'Javier Torrico Alba', ci: '4729103 CBBA', telefono: '+591 71234411', correo: 'javier.torrico@email.com' },
    inquilinoActual: null,
    parqueo: 'P-15',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-10'
  },
  {
    id: 17,
    tipoUnidad: 'Departamento',
    numero: '402',
    piso: 4,
    areaM2: 100.0,
    tipologia: 'Tipo C (100 m²)',
    alicuota: 6.25,
    estado: 'Ocupado por Propietario',
    propietario: { id: 17, nombre: 'Claudia Daza Mendez', ci: '5819204 SCZ', telefono: '+591 79872233', correo: 'claudia.daza@email.com' },
    inquilinoActual: null,
    parqueo: 'P-16',
    baulera: 'B-10',
    fechaRegistro: '2023-01-14'
  },
  {
    id: 18,
    tipoUnidad: 'Departamento',
    numero: '403',
    piso: 4,
    areaM2: 100.0,
    tipologia: 'Tipo C (100 m²)',
    alicuota: 6.25,
    estado: 'Alquilado',
    propietario: { id: 18, nombre: 'Marcelo Rios Quiroga', ci: '6918234 CBBA', telefono: '+591 67124455', correo: 'marcelo.rios@email.com' },
    inquilinoActual: { id: 111, nombre: 'Esteban Morales Zeballos', telefono: '+591 76549988' },
    parqueo: 'P-17',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-28'
  },
  {
    id: 19,
    tipoUnidad: 'Departamento',
    numero: '404',
    piso: 4,
    areaM2: 100.0,
    tipologia: 'Tipo C (100 m²)',
    alicuota: 6.25,
    estado: 'Desocupado',
    propietario: { id: 19, nombre: 'Valeria Soliz Mercado', ci: '7182934 LPZ', telefono: '+591 75439900', correo: 'valeria.soliz@email.com' },
    inquilinoActual: null,
    parqueo: 'P-18',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-03-15'
  },
  {
    id: 20,
    tipoUnidad: 'Departamento',
    numero: '405',
    piso: 4,
    areaM2: 80.0,
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    estado: 'Ocupado por Propietario',
    propietario: { id: 20, nombre: 'Rubén Guzmán Villarroel', ci: '8192044 CBBA', telefono: '+591 72199911', correo: 'ruben.guzman@email.com' },
    inquilinoActual: null,
    parqueo: 'P-19',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-01-08'
  }
]

export default function DepartamentosPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>(UNIDADES_SEED)
  const [activeTab, setActiveTab] = useState<'catastro' | 'tipos' | 'parametros'>('catastro')
  const [tiposDepto, setTiposDepto] = useState<TipoDepartamentoItem[]>(DEFAULT_TIPOS_DEPARTAMENTO)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadItem | null>(null)
  const [unidadToEdit, setUnidadToEdit] = useState<UnidadItem | null>(null)
  const [unidadToAssign, setUnidadToAssign] = useState<UnidadItem | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Cargar parámetros y tipos de departamentos guardados en localStorage
  useEffect(() => {
    try {
      // 1. Tipologías editables
      const savedTipos = localStorage.getItem('edificio_xyz_tipos_departamento')
      if (savedTipos) {
        const parsed = JSON.parse(savedTipos)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTiposDepto(parsed)
        }
      }

      // 2. Parámetros de unidades
      const savedUnidades = localStorage.getItem('edificio_xyz_unidades_parametros')
      if (savedUnidades) {
        const map = JSON.parse(savedUnidades)
        setUnidades((prev) =>
          prev.map((u) => (map[u.id] ? { ...u, ...map[u.id] } : u))
        )
      }
    } catch {}
  }, [])

  // Manejadores para Tipos de Departamentos (100% Editables)
  const handleSaveTipoDepto = (tipoGuardado: TipoDepartamentoItem, cascada: boolean) => {
    setTiposDepto((prev) => {
      const exists = prev.some((t) => t.id === tipoGuardado.id)
      const nuevos = exists
        ? prev.map((t) => (t.id === tipoGuardado.id ? tipoGuardado : t))
        : [...prev, tipoGuardado]

      try {
        localStorage.setItem('edificio_xyz_tipos_departamento', JSON.stringify(nuevos))
      } catch {}
      return nuevos
    })

    // Si se activó la opción de actualizar departamentos asociados
    if (cascada) {
      setUnidades((prev) => {
        const updated = prev.map((u) => {
          const match =
            (u.tipologia && u.tipologia.toLowerCase().includes(tipoGuardado.nombre.toLowerCase())) ||
            (u.tipologia && u.tipologia.includes(tipoGuardado.codigo)) ||
            (u.areaM2 && Math.abs(u.areaM2 - tipoGuardado.areaM2) < 0.1)

          if (match) {
            return {
              ...u,
              tipologia: tipoGuardado.nombre,
              areaM2: tipoGuardado.areaM2,
              expensaBase: tipoGuardado.expensaBase,
              alicuota: Number(((tipoGuardado.areaM2 / 1600) * 100).toFixed(2))
            }
          }
          return u
        })

        try {
          const existingSaved = localStorage.getItem('edificio_xyz_unidades_parametros')
          const map = existingSaved ? JSON.parse(existingSaved) : {}
          updated.forEach((u) => {
            map[u.id] = u
          })
          localStorage.setItem('edificio_xyz_unidades_parametros', JSON.stringify(map))
        } catch {}

        return updated
      })
    }

    showToast(`¡Tipo de departamento "${tipoGuardado.nombre}" guardado exitosamente!`)
  }

  const handleDeleteTipoDepto = (id: string) => {
    setTiposDepto((prev) => {
      const filtered = prev.filter((t) => t.id !== id)
      try {
        localStorage.setItem('edificio_xyz_tipos_departamento', JSON.stringify(filtered))
      } catch {}
      return filtered
    })
  }

  const handleResetDefaultTipos = () => {
    setTiposDepto(DEFAULT_TIPOS_DEPARTAMENTO)
    try {
      localStorage.setItem('edificio_xyz_tipos_departamento', JSON.stringify(DEFAULT_TIPOS_DEPARTAMENTO))
    } catch {}
    showToast('Tipologías restablecidas a los valores de la pizarra (Tipos A, B y C).')
  }

  const handleSincronizarUnidadesTipo = (tipo: TipoDepartamentoItem) => {
    let count = 0
    setUnidades((prev) => {
      const updated = prev.map((u) => {
        const match =
          (u.tipologia && u.tipologia.toLowerCase().includes(tipo.nombre.toLowerCase())) ||
          (u.tipologia && u.tipologia.includes(tipo.codigo)) ||
          (u.areaM2 && Math.abs(u.areaM2 - tipo.areaM2) < 0.1)

        if (match) {
          count++
          return {
            ...u,
            tipologia: tipo.nombre,
            areaM2: tipo.areaM2,
            expensaBase: tipo.expensaBase,
            alicuota: Number(((tipo.areaM2 / 1600) * 100).toFixed(2))
          }
        }
        return u
      })

      try {
        const existingSaved = localStorage.getItem('edificio_xyz_unidades_parametros')
        const map = existingSaved ? JSON.parse(existingSaved) : {}
        updated.forEach((u) => {
          map[u.id] = u
        })
        localStorage.setItem('edificio_xyz_unidades_parametros', JSON.stringify(map))
      } catch {}

      return updated
    })

    showToast(`¡${count} departamentos sincronizados con la tipología "${tipo.nombre}"!`)
  }

  const handleUpdateUnidadParametros = (updated: UnidadItem) => {
    setUnidades((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
    try {
      const existingSaved = localStorage.getItem('edificio_xyz_unidades_parametros')
      const map = existingSaved ? JSON.parse(existingSaved) : {}
      map[updated.id] = updated
      localStorage.setItem('edificio_xyz_unidades_parametros', JSON.stringify(map))
    } catch {}
  }

  const handleUpdateMultipleParametros = (updatedList: UnidadItem[]) => {
    const updatedMap = new Map(updatedList.map((u) => [u.id, u]))
    setUnidades((prev) => prev.map((u) => updatedMap.get(u.id) || u))
    try {
      const existingSaved = localStorage.getItem('edificio_xyz_unidades_parametros')
      const map = existingSaved ? JSON.parse(existingSaved) : {}
      updatedList.forEach((u) => {
        map[u.id] = u
      })
      localStorage.setItem('edificio_xyz_unidades_parametros', JSON.stringify(map))
    } catch {}
  }

  // Fetch unidades desde la API con fallback inteligente
  const fetchUnidades = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/unidades?tipo=${filtroTipo}&estado=${filtroEstado}&search=${encodeURIComponent(searchTerm)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: UnidadItem[] = json.data.map((item: any) => ({
            id: item.id,
            tipoUnidad: item.tipoUnidad,
            numero: item.numero,
            piso: item.piso,
            areaM2: item.areaM2,
            tipologia:
              item.areaM2 === 60 ? 'Tipo A (60 m²)' :
              item.areaM2 === 80 ? 'Tipo B (80 m²)' :
              item.areaM2 === 100 ? 'Tipo C (100 m²)' : undefined,
            alicuota: item.alicuota || (item.areaM2 ? Number(((item.areaM2 / 1600) * 100).toFixed(2)) : undefined),
            estado: item.estado || 'Desocupado',
            parqueo: item.parqueos?.[0]?.numero || item.parqueo || 'Sin parqueo',
            baulera: item.bauleras?.[0]?.numero || item.baulera || 'Sin baulera',
            propietario: item.propietario
              ? {
                  id: item.propietario.idPersona,
                  nombre: `${item.propietario.nombres || ''} ${item.propietario.apellidos || ''}`.trim() || item.propietario.nombre,
                  ci: item.propietario.ciNit || item.propietario.ci,
                  telefono: item.propietario.telefono,
                  correo: item.propietario.correo
                }
              : null,
            inquilinoActual: item.inquilinoActual || null,
            persona: item.persona,
            departamento: item.departamento,
            fechaRegistro: item.fechaRegistro || '2023-01-01'
          }))
          setUnidades(mapped)
        }
      }
    } catch {}
  }, [filtroTipo, filtroEstado, searchTerm])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  const totalAreaConstruida = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Departamento').reduce((acc, d) => acc + (d.areaM2 || 0), 0)
  }, [unidades])

  // Filtrado reactivo
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        u.numero.toLowerCase().includes(searchLower) ||
        (u.propietario &&
          (u.propietario.nombre.toLowerCase().includes(searchLower) ||
            u.propietario.ci.toLowerCase().includes(searchLower))) ||
        (u.inquilinoActual && u.inquilinoActual.nombre.toLowerCase().includes(searchLower))

      const matchTipo = filtroTipo === 'Todos' || u.tipoUnidad === filtroTipo
      const matchEstado = filtroEstado === 'Todos' || u.estado === filtroEstado
      const matchPiso = filtroPiso === 'Todos' || u.piso === Number(filtroPiso)

      return matchSearch && matchTipo && matchEstado && matchPiso
    })
  }, [unidades, searchTerm, filtroTipo, filtroEstado, filtroPiso])

  // KPIs reales del modelo (20 unidades)
  const deptos = unidades.filter((u) => u.tipoUnidad === 'Departamento')
  const totalDeptos = deptos.length
  const ocupadosPropietario = deptos.filter((u) => u.estado === 'Ocupado por Propietario').length
  const alquilados = deptos.filter((u) => u.estado === 'Alquilado').length
  const desocupados = deptos.filter((u) => u.estado === 'Desocupado' || u.estado === 'Disponible').length
  const conParqueo = deptos.filter((u) => u.parqueo !== 'Sin parqueo').length

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleCreateSubmit = async (formData: DepartamentoFormData) => {
    setCreateErrorMessage(null)

    const payload = {
      tipoUnidad: formData.tipoUnidad || 'Departamento',
      numero: formData.numero.trim(),
      piso: formData.piso ? Number(formData.piso) : undefined,
      areaM2: formData.areaM2 ? Number(formData.areaM2) : undefined,
      estado: formData.estado
    }

    try {
      const res = await fetch('/api/v1/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 || json.message?.includes('utilizado')) {
          setCreateErrorMessage('El identificador ya se encuentra utilizado')
        } else {
          setCreateErrorMessage(json.message || 'Error al registrar unidad')
        }
        return
      }

      await fetchUnidades()
      setIsCreateModalOpen(false)
      showToast(`¡Unidad ${payload.tipoUnidad} ${payload.numero} registrada exitosamente!`)
    } catch {
      setCreateErrorMessage('Error de conexión al servidor')
    }
  }

  const handleEditSubmit = async (formData: DepartamentoFormData) => {
    if (!unidadToEdit) return

    // Actualizar estado local y parámetros inmediatamente
    const updatedUnidad: UnidadItem = {
      ...unidadToEdit,
      numero: formData.numero,
      piso: formData.piso,
      areaM2: formData.areaM2,
      tipologia: formData.tipologia || unidadToEdit.tipologia,
      expensaBase: formData.expensaBase ?? unidadToEdit.expensaBase,
      alicuota: formData.areaM2 ? Number(((formData.areaM2 / 1600) * 100).toFixed(2)) : unidadToEdit.alicuota,
      estado: formData.estado
    }
    handleUpdateUnidadParametros(updatedUnidad)

    try {
      const res = await fetch(`/api/v1/unidades/${unidadToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: formData.numero,
          piso: formData.piso,
          areaM2: formData.areaM2,
          estado: formData.estado
        })
      })

      if (res.ok) {
        await fetchUnidades()
      }
    } catch {}

    setIsEditModalOpen(false)
    setUnidadToEdit(null)
    showToast(`¡Unidad ${formData.numero} actualizada correctamente!`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast de confirmación */}
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Catastro de Departamentos & Alícuotas
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Unidades, Propietarios e Inquilinos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Catastro del Edificio XYZ (20 departamentos, 1,600 m²). Todas las unidades generan expensas sin importar si están ocupadas o vacías.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Unidad
        </button>
      </div>

      {/* PESTAÑAS PRINCIPALES: CATASTRO VS PARÁMETROS Y MEDIDORES */}
      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('catastro')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'catastro'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Catastro de Unidades</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {totalDeptos}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tipos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'tipos'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Tipos de Departamentos</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-500/30">
            {tiposDepto.length} Editables
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametros')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'parametros'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Parámetros & Medidores</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
            Pizarra Docente
          </span>
        </button>
      </div>

      {activeTab === 'catastro' ? (
        <>
          {/* KPIS DE OCUPACIÓN REAL */}
      <DepartamentosKpis
        totalDeptos={totalDeptos}
        ocupadosPropietario={ocupadosPropietario}
        alquilados={alquilados}
        desocupados={desocupados}
        conParqueo={conParqueo}
        totalAreaConstruida={totalAreaConstruida}
      />

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número, propietario o inquilino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Estado de Ocupación */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Ocupación: Todas</option>
              <option value="Ocupado por Propietario">Ocupado por Dueño</option>
              <option value="Alquilado">Alquilado a Inquilino</option>
              <option value="Desocupado">Desocupado / Vacío</option>
            </select>
          </div>

          {/* Filtro Piso */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroPiso}
              onChange={(e) => setFiltroPiso(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Piso: Todos</option>
              <option value="1">Piso 1</option>
              <option value="2">Piso 2</option>
              <option value="3">Piso 3</option>
              <option value="4">Piso 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA CATASTRAL DE UNIDADES */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
                <th className="py-3 px-4">Unidad / Tipología</th>
                <th className="py-3 px-4">Propietario Responsable</th>
                <th className="py-3 px-4">Ocupante / Inquilino</th>
                <th className="py-3 px-4">Superficie & Alícuota</th>
                <th className="py-3 px-4">Parqueo / Baulera</th>
                <th className="py-3 px-4">Estado Ocupación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron departamentos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                unidadesFiltradas.map((unidad) => (
                  <tr
                    key={unidad.id}
                    className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                        <span>Dpto. {unidad.numero}</span>
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        {unidad.tipologia || (unidad.areaM2 === 60 ? 'Tipo A (60 m²)' : unidad.areaM2 === 80 ? 'Tipo B (80 m²)' : 'Tipo C (100 m²)')} • Piso {unidad.piso || '-'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {unidad.propietario ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {unidad.propietario.nombre}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            CI: {unidad.propietario.ci}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 italic text-xs">
                          Sin Propietario Asignado
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {unidad.estado === 'Alquilado' && unidad.inquilinoActual ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            {unidad.inquilinoActual.nombre}
                          </div>
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 font-bold">
                            Inquilino (Contrato Privado)
                          </span>
                        </div>
                      ) : unidad.estado === 'Ocupado por Propietario' ? (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          Vive el Propietario
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7d776f] dark:text-slate-400 italic">
                          Desocupado / Vacío
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white font-mono">
                        {unidad.areaM2 ? `${unidad.areaM2} m²` : '—'}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        Alícuota: <span className="font-bold">{unidad.alicuota ? `${unidad.alicuota}%` : '—'}</span>
                      </div>
                      <div className="text-[11px] text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">
                        Bs. {(15500 * ((unidad.alicuota || (unidad.areaM2 ? (unidad.areaM2 / 16) : 0))) / 100).toFixed(2)}/mes
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-xs text-[#262422] dark:text-white flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{unidad.parqueo || 'Sin parqueo'}</span>
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                        <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{unidad.baulera || 'Sin baulera'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          unidad.estado === 'Ocupado por Propietario'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                            : unidad.estado === 'Alquilado'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                        }`}
                      >
                        {unidad.estado}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUnidad(unidad)}
                          className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Ver Ficha y Extracto de Expensa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Extracto
                        </button>
                        <button
                          onClick={() => {
                            setUnidadToEdit(unidad)
                            setIsEditModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                          title="Editar Unidad"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  ) : activeTab === 'tipos' ? (
    <TiposDepartamentosTab
      tipos={tiposDepto}
      unidades={unidades}
      onSaveTipo={handleSaveTipoDepto}
      onDeleteTipo={handleDeleteTipoDepto}
      onResetDefaults={handleResetDefaultTipos}
      onSincronizarUnidadesTipo={handleSincronizarUnidadesTipo}
      showToast={showToast}
    />
  ) : (
    <ParametrosDepartamentosTab
      unidades={unidades}
      onUpdateUnidad={handleUpdateUnidadParametros}
      onUpdateMultiple={handleUpdateMultipleParametros}
      showToast={showToast}
    />
  )}

      {/* MODAL CREAR DEPARTAMENTO */}
      <CrearDepartamentoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        totalAreaConstruida={totalAreaConstruida}
        errorMessage={createErrorMessage}
        tiposDisponibles={tiposDepto}
      />

      {/* MODAL EDITAR DEPARTAMENTO */}
      {unidadToEdit && (
        <EditarDepartamentoModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setUnidadToEdit(null)
          }}
          depto={unidadToEdit}
          onChange={(updated) => setUnidadToEdit(updated)}
          tiposDisponibles={tiposDepto}
          onUpdate={async (updated) => {
            await handleEditSubmit({
              numero: updated.numero,
              piso: updated.piso || 1,
              areaM2: updated.areaM2 || 0,
              tipologia: updated.tipologia,
              expensaBase: updated.expensaBase,
              estado: updated.estado,
              parqueo: updated.parqueo,
              baulera: updated.baulera
            })
          }}
        />
      )}

      {/* MODAL FICHA TÉCNICA */}
      {selectedUnidad && (
        <FichaTecnicaModal
          isOpen={!!selectedUnidad}
          depto={selectedUnidad}
          onClose={() => setSelectedUnidad(null)}
        />
      )}

      {/* MODAL ASIGNAR RESIDENTE / UNIDAD */}
      <AsignarUnidadModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false)
          setUnidadToAssign(null)
        }}
        onSuccess={async () => {
          await fetchUnidades()
          showToast('¡Asignación actualizada correctamente!')
        }}
        unidad={unidadToAssign}
      />
    </div>
  )
}

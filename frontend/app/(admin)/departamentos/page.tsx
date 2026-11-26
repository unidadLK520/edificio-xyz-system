// frontend/app/(admin)/departamentos/page.tsx
// HU03: Módulo de Gestión de Unidades (Departamentos, Parqueos y Bauleras) y Catastro
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { UnidadItem, DepartamentoFormData, TipoDepartamentoItem } from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal, { AssignmentsChangeData } from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'
import AsignarUnidadModal from '@/components/departamentos/AsignarUnidadModal'
import ParametrosDepartamentosTab from '@/components/departamentos/ParametrosDepartamentosTab'
import TiposDepartamentosTab from '@/components/departamentos/TiposDepartamentosTab'
import AguaDepartamentosTab from '@/components/departamentos/AguaDepartamentosTab'
import { apiFetch } from '@/lib/api'
import { mapUnidadesFromApi } from './utils/mapUnidades'
import { updateUnidadAssignments, saveTipoDepartamentoApi } from './utils/departamentosActions'
import { DepartamentosHeader } from './components/DepartamentosHeader'
import { CatastroFilters } from './components/CatastroFilters'
import { CatastroDesktopTable } from './components/CatastroDesktopTable'
import { CatastroMobileCards } from './components/CatastroMobileCards'

export default function DepartamentosPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>([])
  const [activeTab, setActiveTab] = useState<'catastro' | 'tipos' | 'parametros' | 'agua'>('catastro')
  const [subTipoCatastro, setSubTipoCatastro] = useState<'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos'>('Departamentos')
  const [tiposDepto, setTiposDepto] = useState<TipoDepartamentoItem[]>([])
  const [personasList, setPersonasList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadItem | null>(null)
  const [unidadToEdit, setUnidadToEdit] = useState<UnidadItem | null>(null)
  const [unidadToAssign, setUnidadToAssign] = useState<UnidadItem | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const fetchTiposDepto = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/tipos-departamento')
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data)) {
          setTiposDepto(json.data.map((t: any) => ({
            id: String(t.idTipo), idTipo: t.idTipo, nombre: t.nombre,
            codigo: t.nombre.slice(0, 3).toUpperCase(), areaM2: t.areaM2 || 0,
            expensaBase: t.montoExpensa, montoExpensa: t.montoExpensa,
            activo: t.activo !== false, departamentosAsignados: t.departamentosAsignados || 0
          })))
        }
      }
    } catch {}
  }, [])

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/personas?limit=100')
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.data)) setPersonasList(json.data)
      }
    } catch {}
  }, [])

  const fetchUnidades = useCallback(async () => {
    setApiError(null)
    try {
      const res = await apiFetch('/api/v1/unidades?tipo=Todos&limit=100')
      if (!res.ok) { setApiError('Error al conectar con el servidor de unidades.'); setUnidades([]); return }
      const json = await res.json()
      setUnidades(Array.isArray(json.data) ? mapUnidadesFromApi(json.data) : [])
    } catch {
      setApiError('Error de red al conectar con el servidor de unidades.')
      setUnidades([])
    }
  }, [])

  useEffect(() => { fetchTiposDepto(); fetchPersonas(); fetchUnidades() }, [fetchTiposDepto, fetchPersonas, fetchUnidades])

  const handleDeleteTipoDepto = async (id: string): Promise<string | null> => {
    try {
      const idNum = Number(id)
      if (isNaN(idNum)) { setTiposDepto((p) => p.filter((t) => t.id !== id)); return null }
      const res = await apiFetch(`/api/v1/tipos-departamento/${idNum}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: false })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { const msg = json.message || 'No se puede desactivar el tipo de departamento'; showToast(msg); return msg }
      await fetchTiposDepto(); showToast('Tipo de departamento desactivado correctamente.'); return null
    } catch { const msg = 'Error de conexión al desactivar tipo de departamento'; showToast(msg); return msg }
  }

  const handleSincronizarUnidadesTipo = async (tipo: TipoDepartamentoItem) => {
    try {
      const idTipoNum = tipo.idTipo || Number(tipo.id)
      if (!idTipoNum || isNaN(idTipoNum)) { showToast('Tipo no válido para sincronización masiva'); return }
      const deptos = unidades.filter((u) => u.tipoUnidad === 'Departamento' && (
        u.tipologia?.toLowerCase().includes(tipo.nombre.toLowerCase()) ||
        (tipo.codigo && u.tipologia?.includes(tipo.codigo)) ||
        (u.areaM2 && tipo.areaM2 && Math.abs(u.areaM2 - tipo.areaM2) < 0.1)
      ))
      if (deptos.length === 0) { showToast(`No se encontraron departamentos para asociar a "${tipo.nombre}".`); return }
      const res = await apiFetch('/api/v1/departamentos/asignar-tipo', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones: deptos.map((d) => ({ idDepartamento: d.id, idTipo: idTipoNum })) })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { showToast(json.message || `Error al sincronizar departamentos con "${tipo.nombre}"`); return }
      await fetchUnidades(); await fetchTiposDepto()
      showToast(`¡${deptos.length} departamentos sincronizados y asignados a "${tipo.nombre}"!`)
    } catch { showToast('Error de conexión al sincronizar tipologías') }
  }

  const deptosDisponibles = useMemo(() => unidades.filter((u) => u.tipoUnidad === 'Departamento'), [unidades])
  const parqueosDisponibles = useMemo(() => unidades.filter((u) => u.tipoUnidad === 'Parqueo'), [unidades])
  const baulerasDisponibles = useMemo(() => unidades.filter((u) => u.tipoUnidad === 'Baulera'), [unidades])
  const totalAreaConstruida = useMemo(() => deptosDisponibles.reduce((acc, d) => acc + (d.areaM2 || 0), 0), [deptosDisponibles])
  const parqueosLibresCount = useMemo(() => parqueosDisponibles.filter((p) => p.estado === 'Disponible').length, [parqueosDisponibles])
  const baulerasLibresCount = useMemo(() => baulerasDisponibles.filter((b) => b.estado === 'Disponible').length, [baulerasDisponibles])

  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      if (subTipoCatastro === 'Departamentos' && u.tipoUnidad !== 'Departamento') return false
      if (subTipoCatastro === 'Parqueos' && u.tipoUnidad !== 'Parqueo') return false
      if (subTipoCatastro === 'Bauleras' && u.tipoUnidad !== 'Baulera') return false
      const q = searchTerm.toLowerCase().trim()
      if (q) {
        const ok = u.numero.toLowerCase().includes(q) || u.propietario?.nombre.toLowerCase().includes(q) ||
          u.propietario?.ci.toLowerCase().includes(q) || u.inquilinoActual?.nombre.toLowerCase().includes(q) ||
          u.departamento?.numero?.toLowerCase().includes(q) || u.parqueo?.toLowerCase().includes(q) ||
          u.baulera?.toLowerCase().includes(q) || u.persona?.nombres?.toLowerCase().includes(q) ||
          u.persona?.apellidos?.toLowerCase().includes(q) || u.persona?.ciNit?.toLowerCase().includes(q)
        if (!ok) return false
      }
      if (filtroEstado !== 'Todos') {
        const eNorm = u.estado.toLowerCase(), fNorm = filtroEstado.toLowerCase()
        if ((fNorm === 'disponible' || fNorm === 'desocupado') && eNorm !== 'disponible' && eNorm !== 'desocupado') return false
        if (fNorm !== 'disponible' && fNorm !== 'desocupado' && eNorm !== fNorm) return false
      }
      if (filtroPiso !== 'Todos' && u.tipoUnidad === 'Departamento' && u.piso !== Number(filtroPiso)) return false
      return true
    })
  }, [unidades, subTipoCatastro, searchTerm, filtroEstado, filtroPiso])

  const handleCreateSubmit = async (formData: DepartamentoFormData) => {
    setCreateErrorMessage(null)
    const payload = { tipoUnidad: formData.tipoUnidad || 'Departamento', numero: formData.numero.trim(),
      piso: formData.piso ? Number(formData.piso) : undefined, areaM2: formData.areaM2 ? Number(formData.areaM2) : undefined, estado: formData.estado }
    try {
      const res = await apiFetch('/api/v1/unidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) { setCreateErrorMessage(res.status === 409 || json.message?.includes('utilizado') ? 'El identificador ya se encuentra utilizado' : json.message || 'Error al registrar unidad'); return }
      await fetchUnidades(); setIsCreateModalOpen(false)
      showToast(`¡Unidad ${payload.tipoUnidad} ${payload.numero} registrada exitosamente!`)
    } catch { setCreateErrorMessage('Error de conexión al servidor') }
  }

  const handleEditSubmit = async (formData: DepartamentoFormData, assignments?: AssignmentsChangeData) => {
    if (!unidadToEdit) return
    const tipoUnidadParam = unidadToEdit.tipoUnidad || 'Departamento', isDepto = tipoUnidadParam === 'Departamento'
    try {
      if (isDepto && formData.tipologia) {
        const tipoSel = tiposDepto.find((t) => t.nombre === formData.tipologia)
        const idTipoNum = tipoSel?.idTipo || (tipoSel ? Number(tipoSel.id) : null)
        if (idTipoNum && !isNaN(idTipoNum)) {
          await apiFetch(`/api/v1/departamentos/${unidadToEdit.id}/tipo`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idTipo: idTipoNum }) }).catch(() => {})
        }
      }
      const updatePayload: any = { numero: formData.numero, estado: formData.estado }
      if (isDepto) { updatePayload.piso = formData.piso !== undefined ? Number(formData.piso) : undefined; updatePayload.areaM2 = formData.areaM2 !== undefined ? Number(formData.areaM2) : undefined }
      const resBase = await apiFetch(`/api/v1/unidades/${tipoUnidadParam}/${unidadToEdit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatePayload) })
      if (!resBase.ok) { const errJson = await resBase.json().catch(() => ({})); showToast(errJson.message || `Error al actualizar unidad ${formData.numero}`); return }
      if (assignments) await updateUnidadAssignments(unidadToEdit, formData, assignments, parqueosDisponibles, baulerasDisponibles)
      if (isDepto && unidadToEdit.usuarioInquilinoId !== undefined) {
        await apiFetch(`/api/v1/departamentos/${unidadToEdit.id}/asignar-inquilino`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuarioId: unidadToEdit.usuarioInquilinoId }) }).catch(() => {})
      }
      await fetchUnidades(); showToast(`¡${tipoUnidadParam} ${formData.numero} actualizado correctamente!`)
    } catch { showToast(`Error al actualizar datos de ${tipoUnidadParam} ${formData.numero}`) }
    finally { setIsEditModalOpen(false); setUnidadToEdit(null) }
  }

  const handleLiberarUnidad = async (unidad: UnidadItem) => {
    if (!confirm(`¿Está seguro de desvincular y liberar ${unidad.tipoUnidad} ${unidad.numero}? Quedará en estado Disponible y sin departamento vinculado.`)) return
    try {
      const res = await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoUnidad: unidad.tipoUnidad, idUnidad: unidad.id, notas: 'Liberado rápidamente desde panel de catastro' })
      })
      if (res.ok) { await fetchUnidades(); showToast(`¡${unidad.tipoUnidad} ${unidad.numero} liberado y disponible!`) }
      else { const json = await res.json().catch(() => ({})); showToast(json.message || 'Error al liberar unidad') }
    } catch { showToast('Error de conexión al liberar unidad') }
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <DepartamentosHeader
        successToast={successToast} apiError={apiError} onRetry={fetchUnidades}
        totalDeptos={deptosDisponibles.length} totalParqueos={parqueosDisponibles.length}
        totalBauleras={baulerasDisponibles.length} totalUnidades={unidades.length}
        onOpenCreate={() => setIsCreateModalOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}
      />

      {activeTab === 'catastro' ? (
        <>
          <DepartamentosKpis
            totalDeptos={deptosDisponibles.length}
            ocupadosPropietario={deptosDisponibles.filter((u) => u.estado === 'Ocupado por Propietario').length}
            alquilados={deptosDisponibles.filter((u) => u.estado === 'Alquilado').length}
            desocupados={deptosDisponibles.filter((u) => u.estado === 'Desocupado' || u.estado === 'Disponible').length}
            conParqueo={deptosDisponibles.filter((u) => u.parqueo !== 'Sin parqueo').length}
            totalAreaConstruida={totalAreaConstruida}
          />
          <CatastroFilters
            subTipoCatastro={subTipoCatastro} setSubTipoCatastro={setSubTipoCatastro}
            totalDeptos={deptosDisponibles.length} totalParqueos={parqueosDisponibles.length} parqueosLibresCount={parqueosLibresCount}
            totalBauleras={baulerasDisponibles.length} baulerasLibresCount={baulerasLibresCount} totalUnidades={unidades.length}
            unidadesFiltradasCount={unidadesFiltradas.length} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado} filtroPiso={filtroPiso} setFiltroPiso={setFiltroPiso}
          />
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
            <CatastroDesktopTable
              unidadesFiltradas={unidadesFiltradas} subTipoCatastro={subTipoCatastro}
              onSelectUnidad={setSelectedUnidad}
              onAssignUnidad={(u) => { setUnidadToAssign(u); setIsAssignModalOpen(true) }}
              onEditUnidad={(u) => { setUnidadToEdit(u); setIsEditModalOpen(true) }}
              onLiberarUnidad={handleLiberarUnidad}
            />
            <CatastroMobileCards
              unidadesFiltradas={unidadesFiltradas} subTipoCatastro={subTipoCatastro}
              onSelectUnidad={setSelectedUnidad}
              onAssignUnidad={(u) => { setUnidadToAssign(u); setIsAssignModalOpen(true) }}
              onEditUnidad={(u) => { setUnidadToEdit(u); setIsEditModalOpen(true) }}
              onLiberarUnidad={handleLiberarUnidad}
            />
          </div>
        </>
      ) : activeTab === 'tipos' ? (
        <TiposDepartamentosTab
          tipos={tiposDepto} unidades={unidades}
          onSaveTipo={(t) => saveTipoDepartamentoApi(t, fetchTiposDepto, fetchUnidades, showToast)}
          onDeleteTipo={handleDeleteTipoDepto}
          onResetDefaults={() => { fetchTiposDepto(); showToast('Tipologías recargadas desde el servidor.') }}
          onSincronizarUnidadesTipo={handleSincronizarUnidadesTipo} showToast={showToast}
        />
      ) : activeTab === 'agua' ? (
        <AguaDepartamentosTab unidades={unidades} showToast={showToast} />
      ) : (
        <ParametrosDepartamentosTab
          unidades={unidades}
          onUpdateUnidad={(u) => setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...u } : x)))}
          onUpdateMultiple={(list) => { const m = new Map(list.map((u) => [u.id, u])); setUnidades((p) => p.map((u) => m.get(u.id) || u)) }}
          showToast={showToast}
        />
      )}

      <CrearDepartamentoModal
        isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit} totalAreaConstruida={totalAreaConstruida}
        errorMessage={createErrorMessage} tiposDisponibles={tiposDepto}
      />
      {unidadToEdit && (
        <EditarDepartamentoModal
          isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setUnidadToEdit(null) }}
          depto={unidadToEdit} onChange={setUnidadToEdit} tiposDisponibles={tiposDepto}
          parqueosDisponibles={parqueosDisponibles} baulerasDisponibles={baulerasDisponibles}
          deptosDisponibles={deptosDisponibles} personasList={personasList}
          onUpdate={(updated, assignments) => handleEditSubmit({
            tipoUnidad: updated.tipoUnidad, numero: updated.numero, piso: updated.piso || 1,
            areaM2: updated.areaM2 || 0, tipologia: updated.tipologia, expensaBase: updated.expensaBase,
            estado: updated.estado, parqueo: updated.parqueo, baulera: updated.baulera
          }, assignments)}
        />
      )}
      {selectedUnidad && <FichaTecnicaModal isOpen={!!selectedUnidad} depto={selectedUnidad} onClose={() => setSelectedUnidad(null)} />}
      <AsignarUnidadModal
        isOpen={isAssignModalOpen} onClose={() => { setIsAssignModalOpen(false); setUnidadToAssign(null) }}
        onSuccess={async () => { await fetchUnidades(); showToast('¡Asignación actualizada correctamente!') }}
        unidad={unidadToAssign}
      />
    </div>
  )
}

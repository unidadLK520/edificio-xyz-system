// frontend/app/(admin)/egresos/page.tsx
// Módulo Integral de Movimientos Financieros: Ingresos Extraordinarios y Egresos (HU05)

'use client'

import React, { useState } from 'react'
import { X, AlertCircle, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'
import { useEgresos } from './hooks/useEgresos'
import { EgresosHeader } from './components/EgresosHeader'
import { EgresosFilterBar } from './components/EgresosFilterBar'
import { EgresosSummaryCards } from './components/EgresosSummaryCards'
import { EgresosTable } from './components/EgresosTable'
import { CrearMovimientoModal } from './components/CrearMovimientoModal'
import { EditarMovimientoModal } from './components/EditarMovimientoModal'
import { DetalleMovimientoModal } from './components/DetalleMovimientoModal'
import { CategoriasModal } from './components/CategoriasModal'
import { DeleteMovimientoModal } from './components/DeleteMovimientoModal'
import type { MovimientoItem } from './types'

export default function FinanzasPage() {
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string | null } | null>(null)

  const {
    movimientos, movimientosFiltrados, categorias, loading, apiError,
    tabTipo, setTabTipo, searchTerm, setSearchTerm, filtroCategoria, setFiltroCategoria,
    filtroPeriodo, setFiltroPeriodo, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
    totalIngresos, totalEgresos, balanceNeto, cantidadIngresos, cantidadEgresos,
    userRole, hasFinancialPermission,
    isCreateModalOpen, setIsCreateModalOpen, isEditModalOpen, setIsEditModalOpen,
    isCategoriasModalOpen, setIsCategoriasModalOpen, isDetailModalOpen, setIsDetailModalOpen,
    selectedMovimiento, setSelectedMovimiento, movimientoParaEditar, setMovimientoParaEditar,
    movimientoParaEliminar, setMovimientoParaEliminar,
    createModalError, setCreateModalError, editModalError, setEditModalError,
    catModalError, setCatModalError, catModalSuccess, setCatModalSuccess,
    deleteModalError, setDeleteModalError, motivoEliminarInput, setMotivoEliminarInput, isDeleting,
    formData, setFormData, selectedFile, fileNameAttached, handleFileUpload, isSubmitting,
    newCatNombre, setNewCatNombre, newCatTipo, setNewCatTipo,
    editingCatId, setEditingCatId, editingCatNombre, setEditingCatNombre,
    catFiltroTipo, setCatFiltroTipo,
    fetchMovimientos, fetchResumen, fetchCategorias,
    handleOpenCreateModal, handleOpenEditModal, handleCrearMovimiento,
    handleGuardarEdicion, handleConfirmarEliminacion,
    handleCrearCategoria, handleEditarCategoria,
    categoriasParaModal
  } = useEgresos()

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 5000)
  }

  // Wrap handlers to show notifications
  const handleCreateSubmit = async (e: React.FormEvent) => {
    const success = await handleCrearMovimiento(e)
    if (success) {
      showNotification('success', `¡${formData.tipo} registrado correctamente!`)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    const success = await handleGuardarEdicion(e)
    if (success) {
      showNotification('success', 'Movimiento financiero actualizado correctamente.')
    }
  }

  const handleDeleteConfirm = async () => {
    const success = await handleConfirmarEliminacion()
    if (success) {
      showNotification('success', 'Movimiento anulado correctamente.')
    }
  }

  const handleCloseCreate = () => {
    setIsCreateModalOpen(false)
    setCreateModalError(null)
  }

  const handleCloseEdit = () => {
    setIsEditModalOpen(false)
    setMovimientoParaEditar(null)
    setEditModalError(null)
  }

  const handleCloseDelete = () => {
    setMovimientoParaEliminar(null)
    setDeleteModalError(null)
    setMotivoEliminarInput('')
  }

  const handleCloseCategorias = () => {
    setIsCategoriasModalOpen(false)
    setCatModalError(null)
    setCatModalSuccess(null)
    setEditingCatId(null)
  }

  const handleEditCat = (id: number) => {
    void handleEditarCategoria(id)
  }

  const handleStartEditCat = (cat: { idCategoria: number; nombre: string }) => {
    setEditingCatId(cat.idCategoria)
    setEditingCatNombre(cat.nombre)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* NOTIFICATION TOAST */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
            : 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs p-1 opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <EgresosHeader
        hasFinancialPermission={hasFinancialPermission}
        userRole={userRole}
        handleOpenCreateModal={handleOpenCreateModal}
        setCatModalError={setCatModalError}
        setCatModalSuccess={setCatModalSuccess}
        setIsCategoriasModalOpen={setIsCategoriasModalOpen}
      />

      {/* ERROR STATE */}
      {apiError && movimientos.length === 0 && !loading ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Error al cargar los movimientos financieros</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{apiError}</p>
          </div>
          <button
            onClick={fetchMovimientos}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-rose-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <EgresosSummaryCards
            totalIngresos={totalIngresos}
            totalEgresos={totalEgresos}
            balanceNeto={balanceNeto}
            cantidadIngresos={cantidadIngresos}
            cantidadEgresos={cantidadEgresos}
          />

          {/* FILTER BAR */}
          <EgresosFilterBar
            tabTipo={tabTipo}
            setTabTipo={setTabTipo}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            categorias={categorias}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={setFiltroPeriodo}
            fechaDesde={fechaDesde}
            setFechaDesde={setFechaDesde}
            fechaHasta={fechaHasta}
            setFechaHasta={setFechaHasta}
          />

          {/* TABLE */}
          <EgresosTable
            loading={loading}
            movimientosFiltrados={movimientosFiltrados}
            setSelectedMovimiento={(mov: MovimientoItem) => {
              setSelectedMovimiento(mov)
              setIsDetailModalOpen(true)
            }}
            handleOpenEditModal={handleOpenEditModal}
            setMovimientoParaEliminar={setMovimientoParaEliminar}
            hasFinancialPermission={hasFinancialPermission}
          />
        </>
      )}

      {/* MODALS */}
      {isCreateModalOpen && (
        <CrearMovimientoModal
          formData={formData}
          setFormData={setFormData}
          categorias={categorias}
          categoriasParaModal={categoriasParaModal}
          selectedFile={selectedFile}
          fileNameAttached={fileNameAttached}
          handleFileUpload={handleFileUpload}
          isSubmitting={isSubmitting}
          createModalError={createModalError}
          handleSubmit={handleCreateSubmit}
          onClose={handleCloseCreate}
        />
      )}

      {isEditModalOpen && movimientoParaEditar && (
        <EditarMovimientoModal
          movimiento={movimientoParaEditar}
          formData={formData}
          setFormData={setFormData}
          categorias={categorias}
          categoriasParaModal={categoriasParaModal}
          selectedFile={selectedFile}
          fileNameAttached={fileNameAttached}
          handleFileUpload={handleFileUpload}
          isSubmitting={isSubmitting}
          editModalError={editModalError}
          handleSubmit={handleEditSubmit}
          onClose={handleCloseEdit}
        />
      )}

      {isDetailModalOpen && selectedMovimiento && (
        <DetalleMovimientoModal
          movimiento={selectedMovimiento}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedMovimiento(null)
          }}
        />
      )}

      <CategoriasModal
        categorias={categorias}
        isOpen={isCategoriasModalOpen}
        onClose={handleCloseCategorias}
        newCatNombre={newCatNombre}
        setNewCatNombre={setNewCatNombre}
        newCatTipo={newCatTipo}
        setNewCatTipo={setNewCatTipo}
        catModalError={catModalError}
        catModalSuccess={catModalSuccess}
        onCreate={handleCrearCategoria}
        editingCatId={editingCatId}
        editingCatNombre={editingCatNombre}
        setEditingCatNombre={setEditingCatNombre}
        onEdit={handleEditCat}
        onCancelEdit={() => {
          setEditingCatId(null)
          setEditingCatNombre('')
        }}
        catFiltroTipo={catFiltroTipo}
        setCatFiltroTipo={setCatFiltroTipo}
        onStartEdit={handleStartEditCat}
      />

      {movimientoParaEliminar && (
        <DeleteMovimientoModal
          movimiento={movimientoParaEliminar}
          motivo={motivoEliminarInput}
          setMotivo={setMotivoEliminarInput}
          error={deleteModalError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onClose={handleCloseDelete}
        />
      )}
    </div>
  )
}

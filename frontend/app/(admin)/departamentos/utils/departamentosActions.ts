import { apiFetch } from '@/lib/api';
import { UnidadItem, DepartamentoFormData, TipoDepartamentoItem } from '@/components/departamentos/types';
import { AssignmentsChangeData } from '@/components/departamentos/EditarDepartamentoModal';

export async function updateUnidadAssignments(
  unidadToEdit: UnidadItem,
  formData: DepartamentoFormData,
  assignments: AssignmentsChangeData,
  parqueosDisponibles: UnidadItem[],
  baulerasDisponibles: UnidadItem[]
) {
  const tipoUnidadParam = unidadToEdit.tipoUnidad || 'Departamento';
  const isDepto = tipoUnidadParam === 'Departamento';

  if (isDepto) {
    const syncSubUnidad = async (
      subTipo: 'Parqueo' | 'Baulera',
      newId: number | null | undefined,
      disponibles: UnidadItem[],
      currentStr: string | undefined,
      emptyLabel: string
    ) => {
      if (newId === undefined) return;
      const oldSub = disponibles.find(
        (u) => u.idDepartamento === unidadToEdit.id || u.departamento?.idDepartamento === unidadToEdit.id || (u.numero === currentStr && currentStr !== emptyLabel)
      );
      if (newId === null) {
        if (oldSub) {
          await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoUnidad: subTipo, idUnidad: oldSub.id, notas: `Desvinculado desde edición de Dpto ${formData.numero}` }),
          });
        }
      } else if (!oldSub || oldSub.id !== newId) {
        if (oldSub && oldSub.id !== newId) {
          await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoUnidad: subTipo, idUnidad: oldSub.id, notas: `Reasignado para Dpto ${formData.numero}` }),
          });
        }
        await apiFetch('/api/v1/unidades/asignaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoUnidad: subTipo,
            idUnidad: newId,
            idDepartamento: unidadToEdit.id,
            idPersona: unidadToEdit.propietario?.id || undefined,
            tipoRelacion: 'Asignado',
            notas: `Asignado a Dpto ${formData.numero}`,
          }),
        });
      }
    };

    await syncSubUnidad('Parqueo', assignments.parqueoId, parqueosDisponibles, unidadToEdit.parqueo, 'Sin parqueo');
    await syncSubUnidad('Baulera', assignments.bauleraId, baulerasDisponibles, unidadToEdit.baulera, 'Sin baulera');
  } else {
    if (!assignments.departamentoId && !assignments.personaId) {
      if (unidadToEdit.estado === 'Asignado' || unidadToEdit.idDepartamento || unidadToEdit.idPersona) {
        await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipoUnidad: tipoUnidadParam, idUnidad: unidadToEdit.id, notas: 'Desasignado desde panel de edición' }),
        });
      }
    } else {
      await apiFetch('/api/v1/unidades/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoUnidad: tipoUnidadParam,
          idUnidad: unidadToEdit.id,
          idDepartamento: assignments.departamentoId || undefined,
          idPersona: assignments.personaId || undefined,
          tipoRelacion: 'Asignado',
          notas: 'Asignación actualizada desde edición',
        }),
      });
    }
  }
}

export async function saveTipoDepartamentoApi(
  tipoGuardado: TipoDepartamentoItem,
  fetchTiposDepto: () => Promise<void>,
  fetchUnidades: () => Promise<void>,
  showToast: (msg: string) => void
): Promise<string | null> {
  try {
    const idNumerico = tipoGuardado.idTipo || (!isNaN(Number(tipoGuardado.id)) ? Number(tipoGuardado.id) : null);
    const isEdit = !!idNumerico;
    const url = isEdit ? `/api/v1/tipos-departamento/${idNumerico}` : '/api/v1/tipos-departamento';
    const res = await apiFetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: tipoGuardado.nombre.trim(),
        montoExpensa: tipoGuardado.expensaBase,
        areaM2: tipoGuardado.areaM2 > 0 ? tipoGuardado.areaM2 : null,
        activo: tipoGuardado.activo !== false,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = json.message || (res.status === 409 ? 'Conflicto: Ya existe un tipo con ese nombre o no se puede desactivar con unidades asignadas.' : 'Error al guardar el tipo de departamento');
      showToast(errorMsg);
      return errorMsg;
    }
    await fetchTiposDepto();
    await fetchUnidades();
    showToast(`¡Tipo de departamento "${tipoGuardado.nombre}" guardado exitosamente!`);
    return null;
  } catch (e: any) {
    const msg = e?.message || 'Error de conexión al guardar tipo de departamento';
    showToast(msg);
    return msg;
  }
}

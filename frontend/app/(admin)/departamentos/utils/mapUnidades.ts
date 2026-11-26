import { UnidadItem } from '@/components/departamentos/types';

export function mapUnidadesFromApi(data: any[]): UnidadItem[] {
  const parqueosPorDeptoId = new Map<number, string[]>();
  const baulerasPorDeptoId = new Map<number, string[]>();

  data.forEach((item: any) => {
    if (item.tipoUnidad === 'Parqueo' && item.idDepartamento) {
      const list = parqueosPorDeptoId.get(item.idDepartamento) || [];
      if (item.numero && !list.includes(item.numero)) list.push(item.numero);
      parqueosPorDeptoId.set(item.idDepartamento, list);
    } else if (item.tipoUnidad === 'Baulera' && item.idDepartamento) {
      const list = baulerasPorDeptoId.get(item.idDepartamento) || [];
      if (item.numero && !list.includes(item.numero)) list.push(item.numero);
      baulerasPorDeptoId.set(item.idDepartamento, list);
    }
  });

  return data.map((item: any) => {
    const isDepto = item.tipoUnidad === 'Departamento';

    let parqueoStr = 'Sin parqueo';
    if (isDepto) {
      const deptoParqueos: string[] = [];
      if (Array.isArray(item.parqueos)) {
        item.parqueos.forEach((p: any) => {
          if (p?.numero && !deptoParqueos.includes(p.numero)) deptoParqueos.push(p.numero);
        });
      }
      (parqueosPorDeptoId.get(item.id) || []).forEach((num) => {
        if (!deptoParqueos.includes(num)) deptoParqueos.push(num);
      });
      if (deptoParqueos.length > 0) parqueoStr = deptoParqueos.join(', ');
      else if (item.parqueo && item.parqueo !== 'Sin parqueo') parqueoStr = item.parqueo;
    } else if (item.tipoUnidad === 'Parqueo') {
      parqueoStr = item.numero;
    }

    let bauleraStr = 'Sin baulera';
    if (isDepto) {
      const deptoBauleras: string[] = [];
      if (Array.isArray(item.bauleras)) {
        item.bauleras.forEach((b: any) => {
          if (b?.numero && !deptoBauleras.includes(b.numero)) deptoBauleras.push(b.numero);
        });
      }
      (baulerasPorDeptoId.get(item.id) || []).forEach((num) => {
        if (!deptoBauleras.includes(num)) deptoBauleras.push(num);
      });
      if (deptoBauleras.length > 0) bauleraStr = deptoBauleras.join(', ');
      else if (item.baulera && item.baulera !== 'Sin baulera') bauleraStr = item.baulera;
    } else if (item.tipoUnidad === 'Baulera') {
      bauleraStr = item.numero;
    }

    let propietarioObj = null;
    if (item.propietario) {
      const dirRaw = item.propietario.direccion || '';
      const matchEc = dirRaw.match(/\[Estado Civil: ([^|]+) \| Ocupantes: ([^\]]+)\]/);
      propietarioObj = {
        id: item.propietario.idPersona,
        nombre: `${item.propietario.nombres || ''} ${item.propietario.apellidos || ''}`.trim() || item.propietario.nombre,
        ci: item.propietario.ciNit || item.propietario.ci,
        telefono: item.propietario.telefono,
        correo: item.propietario.correo,
        direccion: dirRaw,
        estadoCivil: matchEc ? matchEc[1].trim() : undefined,
        ocupantes: matchEc ? matchEc[2].trim() : undefined,
      };
    }

    let inquilinoObj = null;
    const ocupanteRaw = item.ocupanteActual;
    const tipoOcup = item.tipoOcupante || '';
    const esInquilino =
      tipoOcup.toLowerCase().includes('inquilino') ||
      (ocupanteRaw && (!item.propietario || ocupanteRaw.idPersona !== item.propietario.idPersona));

    if (ocupanteRaw && esInquilino) {
      const dirInqRaw = ocupanteRaw.direccion || '';
      const matchInqEc = dirInqRaw.match(/\[Estado Civil: ([^|]+) \| Ocupantes: ([^\]]+)\]/);
      inquilinoObj = {
        id: ocupanteRaw.idPersona,
        nombre: `${ocupanteRaw.nombres || ''} ${ocupanteRaw.apellidos || ''}`.trim() || ocupanteRaw.nombre,
        ci: ocupanteRaw.ciNit || ocupanteRaw.ci,
        telefono: ocupanteRaw.telefono || 'Sin teléfono',
        correo: ocupanteRaw.correo,
        direccion: dirInqRaw,
        estadoCivil: matchInqEc ? matchInqEc[1].trim() : undefined,
        ocupantes: matchInqEc ? matchInqEc[2].trim() : undefined,
      };
    } else if (item.inquilinoActual) {
      inquilinoObj = item.inquilinoActual;
    }

    let estadoCalculado = item.estado || 'Desocupado';
    if (isDepto) {
      if (inquilinoObj) estadoCalculado = 'Alquilado';
      else if (propietarioObj) estadoCalculado = 'Ocupado por Propietario';
      else estadoCalculado = 'Desocupado';
    } else {
      if (item.departamento || item.idDepartamento || item.persona || item.idPersona) {
        estadoCalculado = 'Asignado';
      } else {
        estadoCalculado = item.estado || 'Disponible';
      }
    }

    return {
      id: item.id,
      tipoUnidad: item.tipoUnidad,
      numero: item.numero,
      piso: item.piso,
      areaM2: item.areaM2,
      tipologia:
        item.tipologia ||
        item.tipo ||
        item.departamento?.tipo?.nombre ||
        (item.areaM2 === 60 ? 'Tipo A (60 m²)' : item.areaM2 === 80 ? 'Tipo B (80 m²)' : item.areaM2 === 100 ? 'Tipo C (100 m²)' : undefined),
      estado: estadoCalculado,
      parqueos: item.parqueos,
      bauleras: item.bauleras,
      parqueo: parqueoStr,
      baulera: bauleraStr,
      propietario: propietarioObj,
      ocupanteActual: ocupanteRaw
        ? {
            id: ocupanteRaw.idPersona,
            nombre: `${ocupanteRaw.nombres || ''} ${ocupanteRaw.apellidos || ''}`.trim() || ocupanteRaw.nombre,
            ci: ocupanteRaw.ciNit || ocupanteRaw.ci,
            telefono: ocupanteRaw.telefono,
            correo: ocupanteRaw.correo,
            direccion: ocupanteRaw.direccion,
          }
        : null,
      tipoOcupante: item.tipoOcupante,
      inquilinoActual: inquilinoObj,
      idDepartamento: item.idDepartamento,
      departamento: item.departamento,
      idPersona: item.idPersona,
      persona: item.persona,
      fechaAsignacion: item.fechaAsignacion || null,
      fechaRegistro: item.fechaRegistro || item.fechaAsignacion || '2023-01-01',
    };
  });
}

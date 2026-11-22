// frontend/lib/imagen.ts
// Utilidad para convertir y redimensionar archivos de imagen a data URI

interface OpcionesImagen {
  maxLado: number
  tipo: 'image/png' | 'image/jpeg'
  calidad?: number
}

export async function imagenADataUri(file: File, o: OpcionesImagen): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida')
  }

  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error('No se pudo decodificar el archivo de imagen')
  }

  const maxDimension = Math.max(bmp.width, bmp.height)
  const escala = maxDimension > 0 ? Math.min(1, o.maxLado / maxDimension) : 1
  const w = Math.max(1, Math.round(bmp.width * escala))
  const h = Math.max(1, Math.round(bmp.height * escala))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bmp.close()
    throw new Error('No se pudo inicializar el contexto de imagen')
  }

  if (o.tipo === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  const uri = canvas.toDataURL(o.tipo, o.calidad)
  if (uri.length > 1_400_000) {
    throw new Error('La imagen reducida supera el límite permitido de 1,4 MB. Selecciona una imagen más liviana.')
  }

  return uri
}

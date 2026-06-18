// lib/face-image.ts
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'clients'

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/)
  if (!match) throw new Error('Formato de imagen inválido')
  const contentType = match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { blob: new Blob([bytes], { type: contentType }), contentType }
}

/** Sube una foto capturada (data URI) al bucket `clients` y devuelve su URL pública. */
export async function uploadFaceImage(companyId: number, clientId: number, dataUrl: string): Promise<string> {
  const { blob, contentType } = dataUrlToBlob(dataUrl)
  const ext = contentType.includes('png') ? 'png' : 'jpeg'
  const path = `${companyId}/${clientId}.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: true })
  if (error) throw new Error(error.message)

  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data
  return `${publicUrl}?t=${Date.now()}`
}

/**
 * El terminal Hikvision necesita el binario de la imagen, no una URL.
 * Si `image` ya es un data URI lo regresa tal cual; si es una URL de Storage la descarga y convierte.
 */
export async function resolveFaceImageBase64(image: string): Promise<string> {
  if (image.startsWith('data:')) return image

  const response = await fetch(image)
  if (!response.ok) throw new Error('No se pudo descargar la foto del cliente.')
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la foto del cliente.'))
    reader.readAsDataURL(blob)
  })
}

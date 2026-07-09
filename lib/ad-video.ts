// lib/ad-video.ts
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'ads'

/**
 * Sube un video (mp4/H.264) al bucket público `ads` y devuelve su URL pública.
 * La ruta es única por subida (`{locationId}/{timestamp}.{ext}`): un video nuevo
 * = URL nueva, así el kiosco detecta el cambio por el hash de la URL y lo re-descarga.
 */
export async function uploadAdVideo(locationId: number, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const path = `${locationId}/${Date.now()}.${ext}`

  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'video/mp4', upsert: false })
  if (error) throw new Error(error.message)

  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data
  return publicUrl
}

/**
 * Borra el objeto de Storage a partir de su URL pública (best-effort).
 * La URL pública tiene forma `.../object/public/ads/{location}/{file}` — extraemos
 * lo que va después de `/ads/` como path dentro del bucket.
 */
export async function deleteAdVideo(videoUrl: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`
  const idx = videoUrl.indexOf(marker)
  if (idx === -1) return

  const path = videoUrl.slice(idx + marker.length).split('?')[0]
  if (!path) return

  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([path])
}

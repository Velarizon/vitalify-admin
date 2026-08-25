// app/(dashboard)/ads/page.tsx
'use client'

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  getBrowserLocations,
  getBrowserAds,
  insertBrowserAd,
  updateBrowserAd,
  toggleBrowserAdActive,
  deleteBrowserAd,
  type AdRow,
} from '@/lib/supabase/browser-catalogs'
import { uploadAdVideo, deleteAdVideo } from '@/lib/ad-video'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Megaphone, MapPin, Film, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

type LocationOption = { id: number; name: string | null }

type AdForm = {
  id?: number
  name: string
  sort_order: string
  file: File | null
  existingUrl: string | null
}

const emptyForm: AdForm = { name: '', sort_order: '0', file: null, existingUrl: null }

export default function AdsPage() {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()

  const [locations, setLocations] = useState<LocationOption[]>([])
  const [locationId, setLocationId] = useState<number | null>(null)
  const [ads, setAds] = useState<AdRow[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AdForm>(emptyForm)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [adToDelete, setAdToDelete] = useState<AdRow | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar las sucursales de la compañía; preseleccionar la del contexto global.
  useEffect(() => {
    if (!userData) return
    getBrowserLocations(userData.company.id)
      .then((rows) => {
        const opts = rows.map((l) => ({ id: l.id, name: l.name }))
        setLocations(opts)
        setLocationId((current) =>
          current ?? selectedLocation?.location.id ?? opts[0]?.id ?? null
        )
      })
      .catch((error) => toast.error((error as Error).message))
  }, [userData, selectedLocation])

  const loadAds = useCallback(async () => {
    if (locationId == null) return
    setLoading(true)
    try {
      setAds(await getBrowserAds(locationId))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    if (locationId == null) return
    const timeoutId = window.setTimeout(() => {
      void loadAds()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [locationId, loadAds])

  const setFile = (file: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
    setForm((current) => ({ ...current, file }))
  }

  const resetForm = () => {
    setFile(null)
    setForm(emptyForm)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (ad: AdRow) => {
    setFile(null)
    setForm({
      id: ad.id,
      name: ad.name,
      sort_order: String(ad.sort_order),
      file: null,
      existingUrl: ad.video_url,
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    setDialogOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (locationId == null) return

    setSaving(true)
    try {
      const name = form.name.trim()
      const sortOrder = Number(form.sort_order) || 0

      if (form.id) {
        // Editar: si hay archivo nuevo, se sube y se reemplaza la URL (y se borra el viejo).
        let videoUrl: string | undefined
        if (form.file) videoUrl = await uploadAdVideo(locationId, form.file)

        await updateBrowserAd(form.id, {
          name,
          sort_order: sortOrder,
          ...(videoUrl ? { video_url: videoUrl } : {}),
        })

        if (videoUrl && form.existingUrl) await deleteAdVideo(form.existingUrl)
        toast.success('Anuncio actualizado')
      } else {
        // Crear: el video es obligatorio.
        if (!form.file) throw new Error('Selecciona un video para el anuncio')
        const videoUrl = await uploadAdVideo(locationId, form.file)
        await insertBrowserAd({ location_id: locationId, name, video_url: videoUrl, sort_order: sortOrder })
        toast.success('Anuncio creado')
      }

      setDialogOpen(false)
      resetForm()
      await loadAds()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (ad: AdRow, active: boolean) => {
    setTogglingId(ad.id)
    try {
      await toggleBrowserAdActive(ad.id, active)
      setAds((current) => current.map((a) => (a.id === ad.id ? { ...a, active } : a)))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    const ad = adToDelete
    if (!ad) return
    setDeletingId(ad.id)
    try {
      await deleteBrowserAd(ad.id)
      await deleteAdVideo(ad.video_url) // best-effort: limpia el archivo del bucket
      setAds((current) => current.filter((a) => a.id !== ad.id))
      toast.success('Anuncio eliminado')
      setAdToDelete(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const canSave = form.name.trim().length > 0 && (!!form.id || !!form.file)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-bold tracking-tight">Gestión de Anuncios</h1>
          <p className="text-technical tracking-widest uppercase">Publicidad del Kiosco</p>
        </div>
        <Button
          size="sm"
          className="h-8 px-4 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon disabled:opacity-30"
          onClick={openCreate}
          disabled={locationId == null}
        >
          <Plus size={14} /> Nuevo Anuncio
        </Button>
      </div>

      {/* Panel de sucursal (parte del cuerpo de la página, no del layout) */}
      <Card className="glass-panel">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <Label className="text-technical">Sucursal</Label>
          </div>
          <Select
            value={locationId != null ? String(locationId) : ''}
            onValueChange={(value) => value && setLocationId(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-72 bg-background/50 border-border">
              <SelectValue placeholder="Selecciona una sucursal" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name ?? `Sucursal ${loc.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Grid de anuncios */}
      {loading ? (
        <TableSkeleton />
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Megaphone className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay anuncios para esta sucursal.</p>
          <p className="text-technical uppercase tracking-widest">Crea el primero con “Nuevo Anuncio”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              className={cn(
                'glass-panel overflow-hidden group transition-all duration-300',
                ad.active ? 'hover:border-primary/40' : 'opacity-60 border-destructive/20'
              )}
            >
              <CardContent className="p-0">
                <div className="relative bg-black aspect-video">
                  <video
                    src={ad.video_url}
                    controls
                    muted
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                    #{ad.sort_order}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Film className={cn('h-3.5 w-3.5', ad.active ? 'text-primary' : 'text-muted-foreground')} />
                    <h3 className="text-base font-bold font-heading uppercase italic tracking-tighter truncate">
                      {ad.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ad.active}
                        disabled={togglingId === ad.id}
                        onCheckedChange={(checked) => handleToggle(ad, checked)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {ad.active ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest gap-1.5 hover:bg-primary/10"
                        onClick={() => openEdit(ad)}
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === ad.id}
                        className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest gap-1.5 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setAdToDelete(ad)}
                      >
                        <Trash2 className="h-3 w-3" /> Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
                <div className={cn('h-1 w-full', ad.active ? 'bg-primary/40 group-hover:bg-primary transition-colors' : 'bg-destructive/40')} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg uppercase tracking-tight">
              {form.id ? 'Modificar Anuncio' : 'Nuevo Anuncio'}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-4 pt-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="ad-name" className="text-technical">Nombre</Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                className="bg-background/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-order" className="text-technical">Orden de reproducción</Label>
              <Input
                id="ad-order"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                className="bg-background/50 border-border"
              />
              <p className="text-[10px] text-muted-foreground">Menor primero. Los videos se reproducen en loop en ese orden.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-technical">Video (mp4 / H.264)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {form.id && !form.file && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Deja vacío para conservar el video actual.
                </p>
              )}

              {(previewUrl || (form.id && form.existingUrl)) && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border/40 bg-black aspect-video">
                  <video
                    src={previewUrl ?? form.existingUrl ?? undefined}
                    controls
                    muted
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest"
                onClick={() => setDialogOpen(false)}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon disabled:opacity-30"
                disabled={saving || !canSave}
              >
                {saving ? 'Procesando...' : form.id ? 'Guardar Cambios' : 'Crear Anuncio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de borrado */}
      <ConfirmDialog
        open={adToDelete != null}
        onOpenChange={(open) => { if (!open) setAdToDelete(null) }}
        title="Eliminar anuncio"
        description={
          adToDelete
            ? `¿Eliminar el anuncio “${adToDelete.name}”? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletingId != null}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

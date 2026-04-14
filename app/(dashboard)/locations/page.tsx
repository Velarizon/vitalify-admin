'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLocations, upsertLocation } from '@/lib/supabase/actions/locations'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

type Location = Awaited<ReturnType<typeof getLocations>>[number]

type LocationForm = {
  id?: number
  name: string
  address: string
  city: string
  zip_code: string
}

const emptyForm: LocationForm = {
  name: '',
  address: '',
  city: '',
  zip_code: '',
}

export default function LocationsPage() {
  const { userData } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<LocationForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadLocations = async () => {
    if (!userData) return
    try {
      const data = await getLocations(userData.company.id)
      setLocations(data)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [userData])

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (location: Location) => {
    setForm({
      id: location.id,
      name: location.name,
      address: location.address ?? '',
      city: location.city ?? '',
      zip_code: location.zip_code ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userData) return

    setSaving(true)
    try {
      await upsertLocation({
        id: form.id,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        zip_code: form.zip_code.trim() || undefined,
        company_id: userData.company.id,
      })
      toast.success(form.id ? 'Ubicación actualizada' : 'Ubicación creada')
      setDialogOpen(false)
      setForm(emptyForm)
      await loadLocations()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<Location>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'city', header: 'Ciudad' },
    { accessorKey: 'address', header: 'Dirección' },
    { accessorKey: 'zip_code', header: 'CP' },
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Ubicaciones</h1>
      <DataTable
        columns={columns}
        data={locations}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            Nueva ubicación
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="location-name">Nombre</Label>
              <Input
                id="location-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-address">Dirección</Label>
              <Input
                id="location-address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-city">Ciudad</Label>
                <Input
                  id="location-city"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-zip">CP</Label>
                <Input
                  id="location-zip"
                  value={form.zip_code}
                  onChange={(event) => setForm((current) => ({ ...current, zip_code: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear ubicación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// app/(dashboard)/workers/page.tsx
'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLocations } from '@/lib/supabase/actions/locations'
import { deactivateWorker, getWorkers, inviteWorker, updateWorker } from '@/lib/supabase/actions/workers'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { toast } from 'sonner'

type Worker = Awaited<ReturnType<typeof getWorkers>>[number]
type Location = Awaited<ReturnType<typeof getLocations>>[number]

type InviteForm = {
  email: string
  role: UserRole
  location_id: string
}

type EditForm = {
  id?: number
  role: UserRole
  location_id: string
}

const emptyInviteForm: InviteForm = {
  email: '',
  role: 'worker',
  location_id: '',
}

const emptyEditForm: EditForm = {
  role: 'worker',
  location_id: '',
}

export default function WorkersPage() {
  const { userData } = useAuthStore()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm)
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm)
  const [savingInvite, setSavingInvite] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)

  const loadData = async () => {
    if (!userData) return
    try {
      const [workerRows, locationRows] = await Promise.all([
        getWorkers(userData.company.id),
        getLocations(userData.company.id),
      ])
      setWorkers(workerRows)
      setLocations(locationRows)
      setInviteForm((current) => ({
        ...current,
        location_id: current.location_id || String(locationRows[0]?.id ?? ''),
      }))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  useEffect(() => {
    loadData()
  }, [userData])

  const openInvite = () => {
    setInviteForm({
      email: '',
      role: 'worker',
      location_id: String(locations[0]?.id ?? ''),
    })
    setInviteOpen(true)
  }

  const openEdit = (worker: Worker) => {
    setEditForm({
      id: worker.id,
      role: (worker.role === 'admin' ? 'admin' : 'worker') as UserRole,
      location_id: String(worker.location_id ?? worker.location?.id ?? ''),
    })
    setEditOpen(true)
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userData) return

    setSavingInvite(true)
    try {
      const { error } = await inviteWorker(
        inviteForm.email.trim(),
        userData.company.id,
        Number(inviteForm.location_id),
        inviteForm.role
      )
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Invitación enviada')
      setInviteOpen(false)
      setInviteForm(emptyInviteForm)
      await loadData()
    } finally {
      setSavingInvite(false)
    }
  }

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editForm.id) return

    setSavingEdit(true)
    try {
      const { error } = await updateWorker(editForm.id, {
        role: editForm.role,
        location_id: Number(editForm.location_id),
      })
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Trabajador actualizado')
      setEditOpen(false)
      setEditForm(emptyEditForm)
      await loadData()
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeactivate = async (worker: Worker) => {
    const confirmed = window.confirm(`¿Desactivar a ${worker.email ?? worker.user_id ?? 'este trabajador'}?`)
    if (!confirmed) return

    setDeactivatingId(worker.id)
    try {
      const { error } = await deactivateWorker(worker.id)
      if (error) {
        toast.error(error)
        return
      }

      toast.success('Trabajador desactivado')
      await loadData()
    } finally {
      setDeactivatingId(null)
    }
  }

  const columns: ColumnDef<Worker>[] = [
    {
      header: 'Email',
      cell: ({ row }) =>
        row.original.email ??
        (row.original.user_id ? `${row.original.user_id.slice(0, 8)}...` : '—'),
    },
    {
      header: 'Rol',
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      header: 'Ubicación',
      cell: ({ row }) => row.original.location?.name ?? '—',
    },
    {
      header: 'Estado',
      cell: () => <Badge variant="outline">Activo</Badge>,
    },
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deactivatingId === row.original.id}
            onClick={() => handleDeactivate(row.original)}
          >
            Desactivar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Trabajadores</h1>
      <DataTable
        columns={columns}
        data={workers}
        toolbar={
          <Button size="sm" onClick={openInvite}>
            Invitar trabajador
          </Button>
        }
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invitar trabajador</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleInvite}>
            <div className="space-y-2">
              <Label htmlFor="worker-email">Email</Label>
              <Input
                id="worker-email"
                type="email"
                value={inviteForm.email}
                onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) =>
                    setInviteForm((current) => ({ ...current, role: value as UserRole }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Select
                  value={inviteForm.location_id}
                  onValueChange={(value) => setInviteForm((current) => ({ ...current, location_id: value ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingInvite || !inviteForm.location_id}>
                {savingInvite ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar trabajador</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, role: value as UserRole }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Select
                  value={editForm.location_id}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, location_id: value ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit || !editForm.location_id}>
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

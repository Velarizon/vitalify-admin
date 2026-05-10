// app/(dashboard)/workers/page.tsx
'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBrowserLocations, getBrowserWorkersPage } from '@/lib/supabase/browser-catalogs'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { toast } from 'sonner'
import { UserPlus, Pencil, ShieldAlert, ShieldCheck, MapPin, Mail, Copy } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/table-skeleton'

type Worker = Awaited<ReturnType<typeof getBrowserWorkersPage>>['data'][number]
type Location = Awaited<ReturnType<typeof getBrowserLocations>>[number]

type CreateForm = {
  name: string
  last_name: string
  email: string
  role: UserRole
  location_id: string
}

type EditForm = {
  id?: number
  name: string
  last_name: string
  role: UserRole
  location_id: string
}

const emptyCreateForm: CreateForm = {
  name: '',
  last_name: '',
  email: '',
  role: 'worker',
  location_id: '',
}

const emptyEditForm: EditForm = {
  name: '',
  last_name: '',
  role: 'worker',
  location_id: '',
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  worker: 'Trabajador',
}

const roleOptions = [
  { value: 'worker', label: roleLabels.worker },
  { value: 'admin', label: roleLabels.admin },
]

async function postWorkerAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/workers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  return result as { error: string | null }
}

function getWorkerName(worker: Worker) {
  return worker.displayName ?? ([worker.name, worker.last_name].filter(Boolean).join(' ') || null)
}

export default function WorkersPage() {
  const { userData } = useAuthStore()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const loadData = useCallback(async () => {
    if (!userData) return
    setLoading(true)
    try {
      const workerResult = await getBrowserWorkersPage(userData.company.id, {
        page: pageIndex + 1,
        pageSize,
        search,
      })
      setWorkers(workerResult.data)
      setTotalRows(workerResult.count)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [search, pageIndex, pageSize, userData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  useEffect(() => {
    if (!userData) return

    void getBrowserLocations(userData.company.id).then((locationRows) => {
      setLocations(locationRows)
      setCreateForm((current) => ({
        ...current,
        location_id: current.location_id || String(locationRows[0]?.id ?? ''),
      }))
    })
  }, [userData])

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  const openCreate = () => {
    setCreateForm({
      name: '',
      last_name: '',
      email: '',
      role: 'worker',
      location_id: String(locations[0]?.id ?? ''),
    })
    setCreateOpen(true)
  }

  const openEdit = (worker: Worker) => {
    setEditForm({
      id: worker.id,
      name: worker.name ?? '',
      last_name: worker.last_name ?? '',
      role: (worker.role === 'admin' ? 'admin' : 'worker') as UserRole,
      location_id: String(worker.location_id ?? worker.location?.id ?? ''),
    })
    setEditOpen(true)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userData) return

    setSavingCreate(true)
    try {
      const { error, tempPassword: pwd } = await postWorkerAction({
        action: 'create',
        email: createForm.email.trim(),
        companyId: userData.company.id,
        locationId: Number(createForm.location_id),
        role: createForm.role,
        profile: {
          name: createForm.name,
          last_name: createForm.last_name,
        },
      }) as { error: string | null; tempPassword: string | null }

      if (error) {
        toast.error(error)
        return
      }

      setCreateOpen(false)
      setCreateForm(emptyCreateForm)
      setTempPassword(pwd)
      await loadData()
    } finally {
      setSavingCreate(false)
    }
  }

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editForm.id) return

    setSavingEdit(true)
    try {
      const { error } = await postWorkerAction({
        action: 'update',
        id: editForm.id,
        name: editForm.name,
        lastName: editForm.last_name,
        role: editForm.role,
        locationId: Number(editForm.location_id),
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
    const confirmed = window.confirm(`¿Desactivar a ${getWorkerName(worker) ?? worker.email ?? worker.user_id ?? 'este trabajador'}?`)
    if (!confirmed) return

    setDeactivatingId(worker.id)
    try {
      const { error } = await postWorkerAction({ action: 'deactivate', id: worker.id })
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
      header: 'Trabajador',
      cell: ({ row }) => {
        const workerName = getWorkerName(row.original)
        const email = row.original.email ?? ''
        const initials = (workerName ?? email).slice(0, 2).toUpperCase() || 'W'
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-border/50">
              <AvatarFallback className="text-[10px] bg-secondary text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">
                {workerName ?? (email || 'ID: ' + row.original.user_id?.slice(0, 8))}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Mail className="h-2.5 w-2.5" /> {workerName && email ? email : 'Corporativo'}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Privilegios',
      cell: ({ row }) => {
        const isAdmin = row.original.role === 'admin'
        return (
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <ShieldCheck className="h-3 w-3 text-primary" />
            ) : (
              <ShieldAlert className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={isAdmin ? "text-primary text-[10px] font-bold uppercase" : "text-muted-foreground text-[10px] font-medium uppercase"}>
              {roleLabels[isAdmin ? 'admin' : 'worker']}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Ubicación',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="text-[10px] font-medium uppercase">{row.original.location?.name ?? 'Sede Central'}</span>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: () => (
        <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
          Activo
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest gap-1.5 hover:bg-primary/10 transition-all" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest text-destructive hover:bg-destructive/10 transition-all"
            disabled={deactivatingId === row.original.id}
            onClick={() => handleDeactivate(row.original)}
          >
            Baja
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold tracking-tight">Trabajadores</h1>
        <Button size="sm" className="h-8 px-4 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon" onClick={openCreate}>
          <UserPlus size={14} /> Agregar Personal
        </Button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        {loading && workers.length === 0 ? <TableSkeleton /> : (
          <DataTable
            columns={columns}
            data={workers}
            searchPlaceholder="Buscar trabajador..."
            pagination={{
              pageIndex,
              pageSize,
              pageCount,
              totalRows,
              onPageChange: (nextPageIndex) => setPageIndex(Math.max(0, Math.min(nextPageIndex, pageCount - 1))),
              onPageSizeChange: (nextPageSize) => {
                setPageIndex(0)
                setPageSize(nextPageSize)
              },
            }}
            search={{
              value: search,
              onChange: (value) => {
                setPageIndex(0)
                setSearch(value)
              },
            }}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Agregar Personal</DialogTitle>
          </DialogHeader>

          <form className="space-y-4 pt-4" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="worker-name" className="text-technical">Nombre</Label>
                <Input
                  id="worker-name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="worker-last-name" className="text-technical">Apellido</Label>
                <Input
                  id="worker-last-name"
                  value={createForm.last_name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker-email" className="text-technical">Email</Label>
              <Input
                id="worker-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                required
                className="bg-background/50 border-border"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-technical">Rol de Acceso</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({ ...current, role: value as UserRole }))
                  }
                  items={roleOptions}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-technical">Ubicación Asignada</Label>
                <Select
                  value={createForm.location_id}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, location_id: value ?? '' }))}
                  items={locations.map(l => ({ value: String(l.id), label: l.name }))}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border">
                    <SelectValue placeholder="Sede" />
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon" disabled={savingCreate || !createForm.location_id}>
                {savingCreate ? 'Creando...' : 'Crear Cuenta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={tempPassword !== null} onOpenChange={() => {}} disablePointerDismissal>
        <DialogContent
          className="sm:max-w-sm bg-card border-border/40"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Contraseña Temporal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Cuenta creada exitosamente. Entrega esta contraseña al trabajador en persona.
            </p>

            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 rounded-lg bg-background border border-border font-mono text-base tracking-widest text-primary font-bold">
                {tempPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-3"
                onClick={() => {
                  if (tempPassword) void navigator.clipboard.writeText(tempPassword)
                  toast.success('Copiado')
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
              <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">
                Esta contraseña no se volverá a mostrar.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              size="sm"
              className="h-9 px-6 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon"
              onClick={() => setTempPassword(null)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg">Modificar Privilegios</DialogTitle>
          </DialogHeader>

          <form className="space-y-4 pt-4" onSubmit={handleEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-worker-name" className="text-technical">Nombre</Label>
                <Input
                  id="edit-worker-name"
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-worker-last-name" className="text-technical">Apellido</Label>
                <Input
                  id="edit-worker-last-name"
                  value={editForm.last_name}
                  onChange={(event) => setEditForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-technical">Rol de Acceso</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, role: value as UserRole }))
                  }
                  items={roleOptions}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-technical">Ubicación Asignada</Label>
                <Select
                  value={editForm.location_id}
                  onValueChange={(value) => setEditForm((current) => ({ ...current, location_id: value ?? '' }))}
                  items={locations.map(l => ({ value: String(l.id), label: l.name }))}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border">
                    <SelectValue placeholder="Sede" />
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon" disabled={savingEdit || !editForm.location_id}>
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

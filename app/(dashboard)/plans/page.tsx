'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getPlans, togglePlanActive, upsertPlan } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

type Plan = Awaited<ReturnType<typeof getPlans>>[number] & {
  is_active?: boolean | null
}

type PlanForm = {
  id?: number
  name: string
  duration: string
  price: string
  access_level: string
  access_start_time: string
  access_end_time: string
}

const emptyForm: PlanForm = {
  name: '',
  duration: '1 month',
  price: '',
  access_level: 'full',
  access_start_time: '',
  access_end_time: '',
}

const durationOptions = [
  { label: '1 día', value: '1 day' },
  { label: '1 semana', value: '1 week' },
  { label: '1 mes', value: '1 month' },
  { label: '3 meses', value: '3 months' },
  { label: '6 meses', value: '6 months' },
  { label: '1 año', value: '1 year' },
]

export default function PlansPage() {
  const { userData } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const loadPlans = async () => {
    if (!userData) return
    try {
      const data = await getPlans(userData.company.id)
      setPlans((data as Plan[]) ?? [])
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [userData])

  const openCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setForm({
      id: plan.id,
      name: plan.name ?? '',
      duration: String(plan.duration ?? '1 month'),
      price: plan.price != null ? String(plan.price) : '',
      access_level: plan.access_level ?? 'full',
      access_start_time: plan.access_start_time ?? '',
      access_end_time: plan.access_end_time ?? '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userData) return

    setSaving(true)
    try {
      await upsertPlan({
        id: form.id,
        name: form.name.trim(),
        duration: form.duration,
        price: Number(form.price),
        access_level: form.access_level,
        access_start_time: form.access_level === 'limited' ? form.access_start_time || null : null,
        access_end_time: form.access_level === 'limited' ? form.access_end_time || null : null,
        company_id: userData.company.id,
      })
      toast.success(form.id ? 'Plan actualizado' : 'Plan creado')
      setDialogOpen(false)
      setForm(emptyForm)
      await loadPlans()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (plan: Plan, nextChecked: boolean) => {
    setTogglingId(plan.id)
    try {
      await togglePlanActive(plan.id, nextChecked)
      setPlans((current) =>
        current.map((item) =>
          item.id === plan.id ? { ...item, is_active: nextChecked } : item
        )
      )
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setTogglingId(null)
    }
  }

  const columns: ColumnDef<Plan>[] = [
    { accessorKey: 'name', header: 'Nombre' },
    { accessorKey: 'duration', header: 'Duración' },
    {
      accessorKey: 'price',
      header: 'Precio',
      cell: ({ row }) =>
        row.original.price != null
          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.original.price)
          : '—',
    },
    { accessorKey: 'access_level', header: 'Acceso' },
    {
      header: 'Estado',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.is_active ?? true}
            disabled={togglingId === row.original.id}
            onCheckedChange={(checked) => handleToggle(row.original, checked)}
          />
          <span className="text-xs text-muted-foreground">
            {(row.original.is_active ?? true) ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
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
      <h1 className="text-lg font-semibold">Planes</h1>
      <DataTable
        columns={columns}
        data={plans}
        searchPlaceholder="Buscar plan..."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            Nuevo plan
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nombre</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duración</Label>
                <Select
                  value={form.duration}
                  onValueChange={(value) => setForm((current) => ({ ...current, duration: value ?? '' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-price">Precio</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nivel de acceso</Label>
              <Select
                value={form.access_level}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    access_level: value ?? '',
                    access_start_time: value === 'limited' ? current.access_start_time : '',
                    access_end_time: value === 'limited' ? current.access_end_time : '',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Completo</SelectItem>
                  <SelectItem value="limited">Limitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.access_level === 'limited' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-start-time">Hora inicio</Label>
                  <Input
                    id="plan-start-time"
                    type="time"
                    value={form.access_start_time}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, access_start_time: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-end-time">Hora fin</Label>
                  <Input
                    id="plan-end-time"
                    type="time"
                    value={form.access_end_time}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, access_end_time: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

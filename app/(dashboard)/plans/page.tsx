// app/(dashboard)/plans/page.tsx
'use client'

import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getPlansPage, togglePlanActive, upsertPlan } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { Plus, Pencil, Clock, CreditCard, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { TableSkeleton } from '@/components/shared/table-skeleton'

type Plan = Awaited<ReturnType<typeof getPlansPage>>['data'][number] & {
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
  const [loading, setLoading] = useState(true)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const loadPlans = useCallback(async () => {
    if (!userData) return
    setLoading(true)
    try {
      const result = await getPlansPage(userData.company.id, {
        page: pageIndex + 1,
        pageSize,
        search: debouncedSearch,
      })
      setPlans((result.data as Plan[]) ?? [])
      setTotalRows(result.count)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageIndex, pageSize, userData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPlans()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadPlans])

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

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

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-bold tracking-tight">Catálogo de Planes</h1>
          <p className="text-hud tracking-widest uppercase">Estrategia de Membresías</p>
        </div>
        <Button size="sm" className="h-8 px-4 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon" onClick={openCreate}>
          <Plus size={14} /> Nuevo Plan
        </Button>
      </div>

      {loading ? <TableSkeleton /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={cn(
              "neon-card overflow-hidden group transition-all duration-300",
              (plan.is_active ?? true) ? "hover:border-primary/40" : "opacity-60 border-destructive/20"
            )}>
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className={cn("h-3.5 w-3.5", (plan.is_active ?? true) ? "text-primary" : "text-muted-foreground")} />
                        <h3 className="text-lg font-bold font-heading uppercase italic tracking-tighter">
                          {plan.name}
                        </h3>
                      </div>
                      <p className="text-hud text-[9px] uppercase tracking-[0.2em]">{plan.duration as string}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-heading text-primary group-hover:drop-shadow-[0_0_8px_rgba(0,255,157,0.3)] transition-all">
                        {fmt(plan.price ?? 0)}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Pago único</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/20">
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" /> Acceso
                      </p>
                      <p className="text-[10px] font-bold uppercase text-foreground">
                        {plan.access_level === 'full' ? 'Completo' : 'Limitado'}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center justify-end gap-1">
                        <Clock className="h-2.5 w-2.5" /> Horario
                      </p>
                      <p className="text-[10px] font-bold uppercase text-foreground font-mono">
                        {plan.access_level === 'full' ? '24/7' : `${plan.access_start_time?.slice(0, 5)} - ${plan.access_end_time?.slice(0, 5)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active ?? true}
                        disabled={togglingId === plan.id}
                        onCheckedChange={(checked) => handleToggle(plan, checked)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {(plan.is_active ?? true) ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] uppercase font-bold tracking-widest gap-1.5 hover:bg-primary/10 transition-all" onClick={() => openEdit(plan)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </div>
                </div>
                <div className={cn(
                  "h-1 w-full",
                  (plan.is_active ?? true) ? "bg-primary/40 group-hover:bg-primary transition-colors" : "bg-destructive/40"
                )} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg uppercase tracking-tight">
              {form.id ? 'Modificar Plan' : 'Configurar Nuevo Plan'}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-4 pt-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="plan-name" className="text-hud">Nombre Comercial</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                className="bg-background/50 border-border"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-hud">Ciclo de Renovación</Label>
                <Select
                  value={form.duration}
                  onValueChange={(value) => setForm((current) => ({ ...current, duration: value ?? '' }))}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border">
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
                <Label htmlFor="plan-price" className="text-hud">Costo (MXN)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="plan-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    required
                    className="pl-9 bg-background/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-hud">Protocolo de Acceso</Label>
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
                <SelectTrigger className="w-full bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Libre (24/7)</SelectItem>
                  <SelectItem value="limited">Restringido (Horario)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.access_level === 'limited' && (
              <div className="grid gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="plan-start-time" className="text-hud">Apertura</Label>
                  <Input
                    id="plan-start-time"
                    type="time"
                    value={form.access_start_time}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, access_start_time: event.target.value }))
                    }
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-end-time" className="text-hud">Cierre</Label>
                  <Input
                    id="plan-end-time"
                    type="time"
                    value={form.access_end_time}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, access_end_time: event.target.value }))
                    }
                    required
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest" onClick={() => setDialogOpen(false)}>
                Descartar
              </Button>
              <Button type="submit" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon" disabled={saving}>
                {saving ? 'Procesando...' : form.id ? 'Guardar Cambios' : 'Confirmar Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

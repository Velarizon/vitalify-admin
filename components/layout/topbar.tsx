// components/layout/topbar.tsx
'use client'

import { Activity, ArrowUpRight, Banknote, Clock, CreditCard, DoorOpen, LogOut, Menu, ReceiptText, RefreshCw, Repeat2, UserRoundPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { logout } from '@/lib/supabase/actions/auth'
import { getActiveShiftSummary } from '@/lib/supabase/actions/shifts'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

interface TopbarProps {
  activeShiftId?: number | null
  activeShiftOpenedAt?: string | null
  hasActiveShift: boolean
  onOpenDoor: () => void
}

type ActiveShiftSummary = Awaited<ReturnType<typeof getActiveShiftSummary>>

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

function formatDuration(openedAt: string | null) {
  if (!openedAt) return '00:00:00'

  const diff = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000))
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':')
}

function useShiftDuration(openedAt: string | null) {
  const [label, setLabel] = useState(() => formatDuration(openedAt))

  useEffect(() => {
    const update = () => setLabel(formatDuration(openedAt))
    update()
    if (!openedAt) return
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [openedAt])

  return label
}

function ShiftMetric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  icon: typeof Activity
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/85 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className={accent ? 'h-3.5 w-3.5 text-primary' : 'h-3.5 w-3.5 text-muted-foreground'} />
      </div>
      <p className={accent ? 'mt-2 text-xl font-black text-primary' : 'mt-2 text-xl font-black text-foreground'}>
        {value}
      </p>
    </div>
  )
}

export function Topbar({ activeShiftId, activeShiftOpenedAt, hasActiveShift, onOpenDoor }: TopbarProps) {
  const { userData, role, clearUserData } = useAuthStore()
  const { selectedLocation, sidebarOpen, toggleSidebar } = usePreferencesStore()
  const duration = useShiftDuration(activeShiftOpenedAt ?? null)
  const [shiftWarning, setShiftWarning] = useState(false)
  const [shiftPanelOpen, setShiftPanelOpen] = useState(false)
  const [shiftSummary, setShiftSummary] = useState<ActiveShiftSummary>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const shiftId = activeShiftId ?? shiftSummary?.shift.id
  const responsibleName = shiftSummary?.responsible?.displayName ?? shiftSummary?.responsible?.email ?? 'Responsable no disponible'

  const loadShiftSummary = useCallback(async () => {
    if (!selectedLocation || !hasActiveShift) return

    setLoadingSummary(true)
    try {
      const summary = await getActiveShiftSummary(selectedLocation.location.id)
      setShiftSummary(summary)
    } finally {
      setLoadingSummary(false)
    }
  }, [hasActiveShift, selectedLocation])

  useEffect(() => {
    if (!shiftPanelOpen) return

    const initialId = window.setTimeout(() => {
      void loadShiftSummary()
    }, 0)
    const id = window.setInterval(() => {
      void loadShiftSummary()
    }, 15_000)

    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(id)
    }
  }, [loadShiftSummary, shiftPanelOpen])

  const handleLogout = async () => {
    if (role === 'worker' && hasActiveShift) {
      setShiftWarning(true)
      return
    }
    clearUserData()
    await logout()
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 md:left-14 md:data-[sidebar-open]:left-[200px] h-16 bg-background/50 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-3 z-30 transition-all duration-300"
        data-sidebar-open={sidebarOpen ? '' : undefined}
      >
        {/* Mobile hamburger */}
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-secondary transition-colors md:hidden">
          <Menu size={18} className="text-muted-foreground" />
        </button>

        <div className="flex-1 text-sm font-medium text-muted-foreground truncate">
          {selectedLocation?.location.name} — {userData?.company.name}
        </div>

        {hasActiveShift && (
          <Popover open={shiftPanelOpen} onOpenChange={setShiftPanelOpen}>
            <PopoverTrigger className="rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              <Badge variant="outline" className="text-primary border-primary gap-1 bg-primary/5 shadow-[0_0_18px_rgba(0,255,157,0.12)]">
                <Clock size={11} />
                Turno
              </Badge>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={10}
              className="w-[min(92vw,34rem)] overflow-hidden border border-border/70 bg-card p-0 shadow-2xl shadow-black/50"
            >
              <div className="border-b border-border/60 bg-background/90 px-5 py-4">
                <div className="flex items-center gap-2 text-lg font-black">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-neon">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </span>
                  Turno activo
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{selectedLocation?.location.name}</span>
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>{responsibleName}</span>
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>Tiempo activo {duration}</span>
                  {loadingSummary && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-primary/35 bg-primary/15 p-4 shadow-[inset_0_0_30px_rgba(0,255,157,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-primary/80">Ingreso total</p>
                      <p className="mt-1 text-4xl font-black tracking-tight text-primary">
                        {fmtCurrency(shiftSummary?.totals.total_amount ?? 0)}
                      </p>
                    </div>
                    <ReceiptText className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-md bg-background/80 p-2">
                      <span className="block uppercase tracking-widest text-muted-foreground">Efectivo</span>
                      <strong className="text-foreground">{fmtCurrency(shiftSummary?.totals.cash_amount ?? 0)}</strong>
                    </div>
                    <div className="rounded-md bg-background/80 p-2">
                      <span className="block uppercase tracking-widest text-muted-foreground">Tarjeta</span>
                      <strong className="text-foreground">{fmtCurrency(shiftSummary?.totals.card_amount ?? 0)}</strong>
                    </div>
                    <div className="rounded-md bg-background/80 p-2">
                      <span className="block uppercase tracking-widest text-muted-foreground">Otros</span>
                      <strong className="text-foreground">{fmtCurrency(shiftSummary?.totals.other_amount ?? 0)}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <ShiftMetric
                    label="Inscripciones"
                    value={String(shiftSummary?.newSubscriptionCount ?? 0)}
                    icon={UserRoundPlus}
                    accent
                  />
                  <ShiftMetric
                    label="Renovaciones"
                    value={String(shiftSummary?.renewalCount ?? 0)}
                    icon={Repeat2}
                  />
                  <ShiftMetric
                    label="Pagos"
                    value={String(shiftSummary?.paymentCount ?? 0)}
                    icon={CreditCard}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ShiftMetric
                    label="Ingreso inscripciones"
                    value={fmtCurrency(shiftSummary?.newSubscriptionIncome ?? 0)}
                    icon={Banknote}
                  />
                  <ShiftMetric
                    label="Ingreso renovaciones"
                    value={fmtCurrency(shiftSummary?.renewalIncome ?? 0)}
                    icon={Banknote}
                  />
                </div>

                <Link
                  href={shiftId ? `/shifts/${shiftId}` : '/shifts'}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-primary/35 bg-primary px-4 py-3 text-primary-foreground shadow-neon transition-all hover:bg-primary/90 hover:shadow-[0_0_28px_rgba(0,255,157,0.22)]"
                  onClick={() => setShiftPanelOpen(false)}
                >
                  <span className="flex flex-col text-left">
                    <span className="text-xs font-black uppercase tracking-widest">Administrar turno</span>
                    <span className="text-[10px] font-medium text-primary-foreground/75">
                      Ver detalle, pagos y finalizar corte
                    </span>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/20 transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onOpenDoor}>
          <DoorOpen size={13} /> Abrir puerta
        </Button>

        <ThemeToggle />

        <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
          <LogOut size={15} />
        </button>
      </header>

      {/* Shift warning dialog */}
      {shiftWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-3 shadow-xl">
            <h3 className="font-semibold">Turno activo</h3>
            <p className="text-sm text-muted-foreground">
              Debes cerrar tu turno antes de cerrar sesión. Ve a Turnos para hacer el corte de caja.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShiftWarning(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => { setShiftWarning(false); window.location.href = '/shifts' }}>
                Ir a Turnos
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

// components/layout/topbar.tsx
'use client'

import { LogOut, DoorOpen, Clock, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { logout } from '@/lib/supabase/actions/auth'
import { useState, useEffect } from 'react'

interface TopbarProps {
  activeShiftOpenedAt?: string | null
  hasActiveShift: boolean
  onOpenDoor: () => void
}

function useShiftDuration(openedAt: string | null) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!openedAt) return
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [openedAt])
  return label
}

export function Topbar({ activeShiftOpenedAt, hasActiveShift, onOpenDoor }: TopbarProps) {
  const { userData, role, clearUserData } = useAuthStore()
  const { selectedLocation, sidebarOpen, toggleSidebar } = usePreferencesStore()
  const duration = useShiftDuration(activeShiftOpenedAt ?? null)
  const [shiftWarning, setShiftWarning] = useState(false)

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
          <Badge variant="outline" className="text-primary border-primary gap-1">
            <Clock size={11} />
            Turno · {duration}
          </Badge>
        )}

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onOpenDoor}>
          <DoorOpen size={13} /> Abrir puerta
        </Button>

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

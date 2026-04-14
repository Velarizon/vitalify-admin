// components/layout/topbar.tsx
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut, DoorOpen, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { logout } from '@/lib/supabase/actions/auth'
import { useState, useEffect } from 'react'

interface TopbarProps {
  isOpen: boolean
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

export function Topbar({ isOpen, activeShiftOpenedAt, hasActiveShift, onOpenDoor }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { userData, role, clearUserData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
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

  const sidebarWidth = isOpen ? 224 : 48

  return (
    <>
      <header
        className="fixed top-0 right-0 h-12 bg-background border-b flex items-center px-4 gap-3 z-30 transition-all duration-200"
        style={{ left: sidebarWidth }}
      >
        <div className="flex-1 text-sm font-medium text-muted-foreground">
          {selectedLocation?.location.name} — {userData?.company.name}
        </div>

        {hasActiveShift && (
          <Badge variant="outline" className="text-emerald-600 border-emerald-600 gap-1">
            <Clock size={11} />
            Turno · {duration}
          </Badge>
        )}

        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onOpenDoor}>
          <DoorOpen size={13} /> Abrir puerta
        </Button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button onClick={handleLogout} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
          <LogOut size={15} />
        </button>
      </header>

      {/* Shift warning dialog */}
      {shiftWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-background rounded-xl p-6 max-w-sm w-full space-y-3 shadow-xl">
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

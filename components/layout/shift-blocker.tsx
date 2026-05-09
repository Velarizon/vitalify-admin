'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { openShift } from '@/lib/supabase/actions/shifts'
import { logout } from '@/lib/supabase/actions/auth'
import { useAuthStore } from '@/stores/auth'
import { LogOut, Timer } from 'lucide-react'

interface ShiftBlockerProps {
  locationId: number
  onShiftOpened: () => void
}

export function ShiftBlocker({ locationId, onShiftOpened }: ShiftBlockerProps) {
  const { clearUserData } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenShift = async () => {
    setLoading(true)
    setError(null)
    const { error } = await openShift(locationId)
    if (error) {
      setError(error)
      setLoading(false)
      return
    }
    onShiftOpened()
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    clearUserData()
    await logout()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-sm mx-4 p-8 rounded-xl border bg-card shadow-xl text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-secondary dark:bg-card flex items-center justify-center">
            <Timer className="text-primary" size={28} />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Iniciar turno</h2>
        <p className="text-sm text-muted-foreground">
          Debes iniciar tu turno para comenzar. Todos los pagos que registres quedarán asociados a este turno.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleOpenShift} disabled={loading || loggingOut} className="w-full">
          {loading ? 'Abriendo turno...' : 'Iniciar turno'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          disabled={loggingOut || loading}
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </div>
    </div>
  )
}

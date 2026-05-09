'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore, UserData, UserRole } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

export default function SetPasswordPage() {
  const router = useRouter()
  const { setUserData } = useAuthStore()
  const { setSelectedLocation } = usePreferencesStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function loadSession() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState(null, '', window.location.pathname)
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        window.history.replaceState(null, '', window.location.pathname)
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('La invitación no tiene una sesión válida. Abre de nuevo el enlace del correo.')
      }
      setCheckingSession(false)
    }

    void loadSession()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const { data: userResult } = await supabase.auth.getUser()
    const userId = userResult.user?.id
    if (userId) {
      const { data: accessRows } = await supabase
        .from('user_access')
        .select('role, location:locations(*), company:companies(*)')
        .eq('user_id', userId)

      if (accessRows && accessRows.length > 0) {
        const firstAccess = accessRows[0] as { role: UserRole; company: UserData['company'] }
        const role = firstAccess.role
        const userData: UserData = {
          company: firstAccess.company,
          user_access: accessRows.map((access) => ({
            location: access.location as UserData['user_access'][number]['location'],
            role: access.role as UserRole,
          })),
        }

        setUserData(userData, role)
        if (userData.user_access.length > 0) {
          setSelectedLocation(userData.user_access[0])
        }
      }
    }

    router.replace('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="text-5xl text-primary drop-shadow-[0_0_15px_rgba(0,255,157,0.3)]">⚡</div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Vitalify</h1>
          <p className="text-technical tracking-[0.2em]">Crear contraseña</p>
        </div>

        <div className="glass-panel p-8 rounded-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-technical">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="h-10 text-sm bg-background/50 border-border hover:border-primary/30 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-technical">
                Confirmar contraseña
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                className="h-10 text-sm bg-background/50 border-border hover:border-primary/30 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
                <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest shadow-neon transition-all"
              disabled={loading || checkingSession}
            >
              {checkingSession ? 'Validando invitación...' : loading ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

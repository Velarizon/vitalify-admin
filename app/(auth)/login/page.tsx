'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore, UserData, UserRole } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

export default function LoginPage() {
  const { setUserData } = useAuthStore()
  const { setSelectedLocation } = usePreferencesStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSession, setKeepSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const { data: accessRows, error: accessError } = await supabase
      .from('user_access')
      .select('role, location:locations(*), company:companies(*)')
      .eq('user_id', loginData.user.id)

    if (accessError || !accessRows || accessRows.length === 0) {
      setError('No se pudo obtener la información del usuario')
      setLoading(false)
      return
    }

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

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Logo + título */}
        <div className="text-center space-y-2">
          <div className="text-5xl text-primary drop-shadow-[0_0_15px_rgba(0,255,157,0.3)]">⚡</div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Vitalify</h1>
          <p className="text-technical tracking-[0.2em]">
            Management Portal v2.4
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-technical">
                Email de acceso
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gimnasio.com"
                required
                className="h-10 text-sm bg-background/50 border-border hover:border-primary/30 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="Contraseña" className="text-technical">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-10 text-sm bg-background/50 border-border hover:border-primary/30 transition-colors"
              />
            </div>

            {/* Checkbox mantener sesión */}
            <div className="flex items-center gap-2 px-1">
              <input
                id="keep-session"
                type="checkbox"
                checked={keepSession}
                onChange={e => setKeepSession(e.target.checked)}
                className="h-3.5 w-3.5 rounded-sm border-border bg-background/50 accent-primary cursor-pointer"
              />
              <Label htmlFor="keep-session" className="text-[10px] text-muted-foreground uppercase tracking-widest cursor-pointer select-none">
                Mantener sesión activa
              </Label>
            </div>

            {error && (
              <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
                <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest shadow-neon transition-all"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>

        {/* Footer status */}
        <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(0,255,157,0.5)]" />
            <span>Sistemas</span>
          </div>
          <span className="text-border/40">|</span>
          <span>Seguridad</span>
          <span className="text-border/40">|</span>
          <span>Soporte</span>
        </div>
      </div>
    </div>
  )
}

// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { login, getUserData } from '@/lib/supabase/actions/auth'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

export default function LoginPage() {
  const router = useRouter()
  const { setUserData } = useAuthStore()
  const { setSelectedLocation } = usePreferencesStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await login(email, password)
    if (loginError) {
      setError(loginError)
      setLoading(false)
      return
    }

    const { userData, role } = await getUserData()
    if (!userData || !role) {
      setError('No se pudo obtener la información del usuario')
      setLoading(false)
      return
    }

    setUserData(userData, role)
    // Auto-select first location
    if (userData.user_access.length > 0) {
      setSelectedLocation(userData.user_access[0])
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="text-center">
          <div className="text-3xl mb-2 text-primary">⚡</div>
          <CardTitle className="text-xl font-bold tracking-tight">Vitalify Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gimnasio.com"
                required
                className="h-9 text-sm bg-background border-border"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" title="Contraseña" className="text-xs text-muted-foreground">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-9 text-sm bg-background border-border"
              />
            </div>
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            <Button type="submit" className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

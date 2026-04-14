# Vitalify Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el proyecto Vitalify Admin en `/Users/krissk1ng/Documents/kraken/vitalify-admin` — migración de kraken-web a Next.js 15 con shadcn/ui, paleta emerald, roles ADMIN/WORKER, y turnos/corte de caja.

**Architecture:** Next.js 15 App Router. Server Components para fetches iniciales, Server Actions para mutaciones. Supabase SSR con cookies para que el middleware del servidor pueda verificar sesión y rol sin JavaScript. Zustand solo para estado UI (empresa activa, ubicación seleccionada).

**Tech Stack:** Next.js 15, React 19, TypeScript, shadcn/ui, Tailwind CSS (emerald), Supabase JS + @supabase/ssr, Zustand, next-themes, Vitest, Lucide React, @tanstack/react-table

---

## File Map

```
vitalify-admin/
├── app/
│   ├── layout.tsx                          # Root layout + ThemeProvider + Inter font
│   ├── globals.css                         # Tailwind + shadcn CSS vars
│   ├── (auth)/login/page.tsx               # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Sidebar + topbar + ShiftBlocker check
│   │   ├── page.tsx                        # Dashboard
│   │   ├── clients/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── plans/page.tsx
│   │   ├── locations/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── reports/monthly-payments/page.tsx
│   │   ├── shifts/page.tsx
│   │   ├── shifts/[id]/page.tsx
│   │   ├── workers/page.tsx
│   │   └── terminal/page.tsx
│   └── api/terminal/route.ts               # Proxy al agente Hikvision local
├── components/
│   ├── ui/                                 # shadcn/ui generados (no editar manualmente)
│   ├── layout/
│   │   ├── sidebar.tsx                     # Mini sidebar colapsable (iconos + expand)
│   │   ├── topbar.tsx                      # Topbar con badge turno + theme toggle
│   │   └── shift-blocker.tsx               # Modal bloqueante para WORKER sin turno
│   └── shared/
│       ├── data-table.tsx                  # Tabla reutilizable data-dense
│       └── metric-card.tsx                 # Card de KPI para dashboard
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # createBrowserClient
│   │   ├── server.ts                       # createServerClient (async cookies)
│   │   └── actions/
│   │       ├── auth.ts                     # login, logout, getUserData
│   │       ├── clients.ts                  # getClients, createClientFull
│   │       ├── payments.ts                 # getPayments, createPayment
│   │       ├── plans.ts                    # getPlans, upsertPlan
│   │       ├── locations.ts                # getLocations, upsertLocation
│   │       ├── shifts.ts                   # openShift, closeShift, getActiveShift, getShifts
│   │       ├── workers.ts                  # getWorkers, inviteWorker
│   │       └── dashboard.ts               # getDashboardData
│   ├── shifts.ts                           # computeShiftTotals (función pura, testeable)
│   └── terminal.ts                         # Terminal class (copiada de kraken-web)
├── middleware.ts                            # Auth + role-based routing
├── stores/
│   ├── auth.ts                             # useAuthStore (isAuthenticated, userData, role)
│   └── preferences.ts                      # usePreferencesStore (selectedLocation)
├── types/
│   └── supabase.ts                         # Tipos generados de Supabase (copiar de kraken-web)
├── vitest.config.ts
├── vitest.setup.ts
└── .env.local
```

---

## Phase 1: Foundation

### Task 1: Scaffold Next.js 15 + Vitest

**Files:**
- Create: `vitalify-admin/` (todo el scaffold)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Crear el proyecto**

```bash
cd /Users/krissk1ng/Documents/kraken
npx create-next-app@latest vitalify-admin \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

Cuando pregunte "Would you like to use Turbopack...?" → No (ya está en el flag).

- [ ] **Step 2: Instalar dependencias**

```bash
cd vitalify-admin
npm install @supabase/supabase-js @supabase/ssr zustand next-themes lucide-react @tanstack/react-table
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Crear vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Crear vitest.setup.ts**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Agregar scripts al package.json**

En `package.json`, agregar dentro de `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Verificar que el proyecto arranca**

```bash
npm run dev
```

Esperado: servidor corriendo en `http://localhost:3000` sin errores.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project with Vitest"
```

---

### Task 2: shadcn/ui + Tailwind emerald + dark mode

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `components/ui/` (generado por shadcn)
- Create: `components.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Inicializar shadcn/ui**

```bash
npx shadcn@latest init
```

Responder los prompts:
- Style → Default
- Base color → **Emerald**
- CSS variables → Yes

- [ ] **Step 2: Instalar componentes shadcn necesarios**

```bash
npx shadcn@latest add button input label table badge card dialog select separator skeleton sheet avatar sonner tooltip
```

- [ ] **Step 3: Instalar next-themes y actualizar app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vitalify Admin',
  description: 'Panel de administración Vitalify',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verificar paleta emerald en globals.css**

Confirmar que `app/globals.css` contiene variables CSS con valores emerald (generadas por shadcn). Debe verse similar a:
```css
:root {
  --primary: 160 84% 39%; /* emerald-600 aprox */
  ...
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add shadcn/ui with emerald theme and dark mode"
```

---

### Task 3: Supabase clients + tipos

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `types/supabase.ts`
- Create: `.env.local`

- [ ] **Step 1: Crear .env.local**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env>
```

- [ ] **Step 2: Crear lib/supabase/client.ts (browser)**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Crear lib/supabase/server.ts (Server Components / Actions)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Copiar tipos de Supabase**

```bash
cp /Users/krissk1ng/Documents/kraken/kraken-web/src/supabase/types/supabase.ts \
   /Users/krissk1ng/Documents/kraken/vitalify-admin/types/supabase.ts
```

Los tipos actuales no incluyen `shifts` ni los nuevos campos de `payments` — se actualizarán después de la migración de DB (Task 5).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Supabase browser and server clients"
```

---

### Task 4: Zustand stores

**Files:**
- Create: `stores/auth.ts`
- Create: `stores/preferences.ts`

- [ ] **Step 1: Crear stores/auth.ts**

```typescript
// stores/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Company {
  id: number
  name: string
  owner: string
  country: string
  club_type: string
  client_range: string
}

export interface Location {
  id: number
  city: string
  name: string
  address: string
  zip_code: string
  company_id: number
}

export interface UserAccess {
  location: Location
  role: 'admin' | 'worker'
}

export interface UserData {
  company: Company
  user_access: UserAccess[]
}

interface AuthStore {
  isAuthenticated: boolean
  userData: UserData | null
  role: 'admin' | 'worker' | null
  setUserData: (userData: UserData, role: 'admin' | 'worker') => void
  clearUserData: () => void
}

export const useAuthStore = create(
  persist<AuthStore>(
    (set) => ({
      isAuthenticated: false,
      userData: null,
      role: null,
      setUserData: (userData, role) => set({ userData, role, isAuthenticated: true }),
      clearUserData: () => set({ userData: null, role: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
```

- [ ] **Step 2: Crear stores/preferences.ts**

```typescript
// stores/preferences.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserAccess } from './auth'

interface PreferencesStore {
  selectedLocation: UserAccess | null
  setSelectedLocation: (location: UserAccess | null) => void
}

export const usePreferencesStore = create(
  persist<PreferencesStore>(
    (set) => ({
      selectedLocation: null,
      setSelectedLocation: (location) => set({ selectedLocation: location }),
    }),
    { name: 'user-preferences' }
  )
)
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Zustand stores for auth and preferences"
```

---

### Task 5: DB migration + computeShiftTotals util

**Files:**
- Create: `lib/shifts.ts`
- Create: `lib/__tests__/shifts.test.ts`

La migración SQL se ejecuta en el Dashboard de Supabase (SQL Editor), no en archivos del repo.

- [ ] **Step 1: Ejecutar migración en Supabase SQL Editor**

Ir a `https://supabase.com/dashboard/project/ekpujtewohbquqjwtowr/sql` y ejecutar:

```sql
-- 1. Tabla shifts
CREATE TABLE shifts (
  id              serial PRIMARY KEY,
  location_id     integer NOT NULL REFERENCES locations(id),
  opened_by       uuid NOT NULL,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  cash_amount     numeric NOT NULL DEFAULT 0,
  card_amount     numeric NOT NULL DEFAULT 0,
  other_amount    numeric NOT NULL DEFAULT 0,
  total_amount    numeric NOT NULL DEFAULT 0,
  notes           text
);

CREATE INDEX idx_shifts_opened_by_location ON shifts(opened_by, location_id);
CREATE INDEX idx_shifts_location_closed ON shifts(location_id, closed_at);

-- 2. Columnas nuevas en payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS shift_id integer REFERENCES shifts(id),
  ADD COLUMN IF NOT EXISTS registered_by uuid;

CREATE INDEX idx_payments_shift ON payments(shift_id);
```

- [ ] **Step 2: Verificar en Supabase Table Editor**

Confirmar que la tabla `shifts` existe y que `payments` tiene las columnas `shift_id` y `registered_by`.

- [ ] **Step 3: Escribir test para computeShiftTotals**

```typescript
// lib/__tests__/shifts.test.ts
import { describe, it, expect } from 'vitest'
import { computeShiftTotals } from '../shifts'

describe('computeShiftTotals', () => {
  it('suma correctamente por método de pago', () => {
    const payments = [
      { amount: 500, payment_method: 'cash' },
      { amount: 300, payment_method: 'cash' },
      { amount: 1000, payment_method: 'card' },
      { amount: 200, payment_method: 'transfer' },
    ]
    const result = computeShiftTotals(payments)
    expect(result.cash_amount).toBe(800)
    expect(result.card_amount).toBe(1000)
    expect(result.other_amount).toBe(200)
    expect(result.total_amount).toBe(2000)
  })

  it('retorna ceros para array vacío', () => {
    const result = computeShiftTotals([])
    expect(result.cash_amount).toBe(0)
    expect(result.card_amount).toBe(0)
    expect(result.other_amount).toBe(0)
    expect(result.total_amount).toBe(0)
  })

  it('trata métodos desconocidos como other', () => {
    const payments = [{ amount: 100, payment_method: 'crypto' }]
    const result = computeShiftTotals(payments)
    expect(result.other_amount).toBe(100)
    expect(result.total_amount).toBe(100)
  })
})
```

- [ ] **Step 4: Correr test — debe fallar**

```bash
npm run test:run lib/__tests__/shifts.test.ts
```

Esperado: FAIL — `computeShiftTotals` no existe aún.

- [ ] **Step 5: Implementar lib/shifts.ts**

```typescript
// lib/shifts.ts
export interface ShiftPayment {
  amount: number
  payment_method: string | null
}

export interface ShiftTotals {
  cash_amount: number
  card_amount: number
  other_amount: number
  total_amount: number
}

export function computeShiftTotals(payments: ShiftPayment[]): ShiftTotals {
  const cash_amount = payments
    .filter(p => p.payment_method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0)
  const card_amount = payments
    .filter(p => p.payment_method === 'card')
    .reduce((sum, p) => sum + p.amount, 0)
  const other_amount = payments
    .filter(p => p.payment_method !== 'cash' && p.payment_method !== 'card')
    .reduce((sum, p) => sum + p.amount, 0)
  return { cash_amount, card_amount, other_amount, total_amount: cash_amount + card_amount + other_amount }
}
```

- [ ] **Step 6: Correr test — debe pasar**

```bash
npm run test:run lib/__tests__/shifts.test.ts
```

Esperado: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add shifts DB migration and computeShiftTotals util"
```

---

### Task 6: Middleware (auth + role-based routing)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Crear middleware.ts**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ONLY_PATHS = ['/plans', '/locations', '/reports', '/workers', '/terminal']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user) {
    const { data: access } = await supabase
      .from('user_access')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = access?.role
    const isAdminOnly = ADMIN_ONLY_PATHS.some(p => path.startsWith(p))

    if (role === 'worker' && isAdminOnly) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for auth and role-based routing"
```

---

## Phase 2: Auth & Shell

### Task 7: Login page + auth actions

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `lib/supabase/actions/auth.ts`

- [ ] **Step 1: Crear lib/supabase/actions/auth.ts**

```typescript
// lib/supabase/actions/auth.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { UserData } from '@/stores/auth'
import { redirect } from 'next/navigation'

export async function login(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { error: null }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUserData(): Promise<{ userData: UserData | null; role: 'admin' | 'worker' | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userData: null, role: null }

  const { data: accessRows } = await supabase
    .from('user_access')
    .select('role, location:locations(*), company:companies(*)')
    .eq('user_id', user.id)

  if (!accessRows || accessRows.length === 0) return { userData: null, role: null }

  const firstAccess = accessRows[0] as any
  const role = firstAccess.role as 'admin' | 'worker'

  const userData: UserData = {
    company: firstAccess.company,
    user_access: accessRows.map((a: any) => ({ location: a.location, role: a.role })),
  }

  return { userData, role }
}
```

- [ ] **Step 2: Crear app/(auth)/login/page.tsx**

```tsx
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
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-3xl mb-2">⚡</div>
          <CardTitle className="text-xl">Vitalify Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gimnasio.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add login page and auth server actions"
```

---

### Task 8: Sidebar + Topbar + Dashboard layout

**Files:**
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/topbar.tsx`
- Create: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Crear components/layout/sidebar.tsx**

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

const allNavItems = [
  { label: 'Dashboard',     href: '/',          icon: Home,          adminOnly: false },
  { label: 'Clientes',      href: '/clients',   icon: Users,         adminOnly: false },
  { label: 'Pagos',         href: '/payments',  icon: CreditCard,    adminOnly: false },
  { label: 'Turnos',        href: '/shifts',    icon: Timer,         adminOnly: false },
  { label: 'Planes',        href: '/plans',     icon: ClipboardList, adminOnly: true  },
  { label: 'Ubicaciones',   href: '/locations', icon: MapPin,        adminOnly: true  },
  { label: 'Reportes',      href: '/reports',   icon: BarChart3,     adminOnly: true  },
  { label: 'Trabajadores',  href: '/workers',   icon: UserCog,       adminOnly: true  },
  { label: 'Terminal',      href: '/terminal',  icon: Fingerprint,   adminOnly: true  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useAuthStore()
  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'admin')

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-emerald-900 text-emerald-100 flex flex-col transition-all duration-200 z-40',
          isOpen ? 'w-56' : 'w-12'
        )}
      >
        {/* Logo + toggle */}
        <div className={cn('flex items-center h-12 px-2 border-b border-emerald-800', isOpen ? 'justify-between' : 'justify-center')}>
          {isOpen && <span className="font-bold text-emerald-300 text-sm ml-1">⚡ Vitalify</span>}
          <button onClick={onToggle} className="p-1 rounded hover:bg-emerald-800 transition-colors">
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 mx-1 px-2 py-1.5 rounded text-sm transition-colors',
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-300 hover:bg-emerald-800 hover:text-white'
                    )}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Crear components/layout/topbar.tsx**

```tsx
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
```

- [ ] **Step 3: Crear app/(dashboard)/layout.tsx**

```tsx
// app/(dashboard)/layout.tsx
import { useState } from 'react' // necesita 'use client' — ver abajo
// Este layout usa estado, debe ser client
```

El layout necesita `useState` para el toggle del sidebar. En Next.js, los layouts pueden ser Client Components:

```tsx
// app/(dashboard)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ShiftBlocker } from '@/components/layout/shift-blocker'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null)
  const [shiftChecked, setShiftChecked] = useState(false)
  const { role } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()

  useEffect(() => {
    if (!selectedLocation) return
    getActiveShift(selectedLocation.location.id).then(shift => {
      setActiveShift(shift)
      setShiftChecked(true)
    })
  }, [selectedLocation])

  const handleOpenDoor = async () => {
    const { Terminal } = await import('@/lib/terminal')
    Terminal.openDoor()
  }

  const showShiftBlocker = role === 'worker' && shiftChecked && !activeShift

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
      <Topbar
        isOpen={sidebarOpen}
        hasActiveShift={!!activeShift}
        activeShiftOpenedAt={activeShift?.opened_at}
        onOpenDoor={handleOpenDoor}
      />
      <main
        className="pt-12 min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarOpen ? 224 : 48 }}
      >
        <div className="p-4">{children}</div>
      </main>
      {showShiftBlocker && (
        <ShiftBlocker
          locationId={selectedLocation!.location.id}
          onShiftOpened={() => {
            getActiveShift(selectedLocation!.location.id).then(setActiveShift)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add sidebar, topbar and dashboard layout"
```

---

### Task 9: ShiftBlocker modal

**Files:**
- Create: `components/layout/shift-blocker.tsx`

- [ ] **Step 1: Crear components/layout/shift-blocker.tsx**

```tsx
// components/layout/shift-blocker.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { openShift } from '@/lib/supabase/actions/shifts'
import { Timer } from 'lucide-react'

interface ShiftBlockerProps {
  locationId: number
  onShiftOpened: () => void
}

export function ShiftBlocker({ locationId, onShiftOpened }: ShiftBlockerProps) {
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-sm mx-4 p-8 rounded-xl border bg-card shadow-xl text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <Timer className="text-emerald-600" size={28} />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Iniciar turno</h2>
        <p className="text-sm text-muted-foreground">
          Debes iniciar tu turno para comenzar. Todos los pagos que registres quedarán asociados a este turno.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleOpenShift} disabled={loading} className="w-full">
          {loading ? 'Abriendo turno...' : 'Iniciar turno'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear lib/supabase/actions/shifts.ts (funciones base)**

```typescript
// lib/supabase/actions/shifts.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeShiftTotals } from '@/lib/shifts'

export async function getActiveShift(locationId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('shifts')
    .select('id, opened_at, location_id, opened_by')
    .eq('opened_by', user.id)
    .eq('location_id', locationId)
    .is('closed_at', null)
    .maybeSingle()

  return data
}

export async function openShift(locationId: number): Promise<{ data: unknown; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const existing = await getActiveShift(locationId)
  if (existing) return { data: null, error: 'Ya existe un turno activo' }

  const { data, error } = await supabase
    .from('shifts')
    .insert({ location_id: locationId, opened_by: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/shifts')
  return { data, error: null }
}

export async function closeShift(shiftId: number, notes?: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_method')
    .eq('shift_id', shiftId)

  const totals = computeShiftTotals(
    (payments ?? []).map(p => ({ amount: p.amount ?? 0, payment_method: p.payment_method ?? '' }))
  )

  const { error } = await supabase
    .from('shifts')
    .update({ closed_at: new Date().toISOString(), notes: notes ?? null, ...totals })
    .eq('id', shiftId)
    .eq('opened_by', user.id)

  if (error) return { error: error.message }
  revalidatePath('/shifts')
  return { error: null }
}

export async function getShifts(locationId: number, userId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('shifts')
    .select('*')
    .eq('location_id', locationId)
    .order('opened_at', { ascending: false })

  if (userId) query = query.eq('opened_by', userId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add ShiftBlocker modal and shifts server actions"
```

---

## Phase 3: Shared components + migrated screens

### Task 10: Shared DataTable + MetricCard

**Files:**
- Create: `components/shared/data-table.tsx`
- Create: `components/shared/metric-card.tsx`

- [ ] **Step 1: Crear components/shared/data-table.tsx**

```tsx
// components/shared/data-table.tsx
'use client'

import {
  ColumnDef, flexRender, getCoreRowModel,
  getFilteredRowModel, getPaginationRowModel, useReactTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns, data, searchPlaceholder = 'Buscar...', toolbar,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data, columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="h-7 w-56 text-xs"
        />
        {toolbar}
      </div>
      <div className="rounded border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="h-7 text-xs px-2">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="h-7">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-0.5 px-2 text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-16 text-center text-xs text-muted-foreground">
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} resultado(s)</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-6 text-xs px-2"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-xs px-2"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear components/shared/metric-card.tsx**

```tsx
// components/shared/metric-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
}

export function MetricCard({ title, value, subtitle, className }: MetricCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add shared DataTable and MetricCard components"
```

---

### Task 11: Dashboard page

**Files:**
- Create: `lib/supabase/actions/dashboard.ts`
- Create: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Crear lib/supabase/actions/dashboard.ts**

```typescript
// lib/supabase/actions/dashboard.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData(companyId: number, locationId: number) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [clientsRes, paymentsRes, genderRes, plansRes, birthdaysRes] = await Promise.all([
    supabase.from('subscriptions').select('id', { count: 'exact' })
      .eq('location_id', locationId)
      .gte('end_date', today),
    supabase.from('payments').select('amount')
      .eq('location_id', locationId)
      .gte('payment_date', firstOfMonth),
    supabase.from('clients').select('gender').eq('company_id', companyId),
    supabase.from('subscriptions').select('plans(name)', { count: 'exact' })
      .eq('location_id', locationId),
    supabase.from('clients').select('name, last_name, date_of_birth')
      .eq('company_id', companyId)
      .like('date_of_birth', `%-${today.slice(5)}`),
  ])

  const totalClients = clientsRes.count ?? 0
  const monthlyRevenue = (paymentsRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)

  const genderCount = { M: 0, F: 0, O: 0 }
  for (const c of genderRes.data ?? []) {
    const g = (c.gender ?? 'O') as 'M' | 'F' | 'O'
    genderCount[g] = (genderCount[g] ?? 0) + 1
  }

  const planMap: Record<string, number> = {}
  for (const s of plansRes.data ?? []) {
    const name = (s.plans as any)?.name ?? 'Sin plan'
    planMap[name] = (planMap[name] ?? 0) + 1
  }

  return {
    totalClients,
    monthlyRevenue,
    genderCount,
    planData: Object.entries(planMap).map(([name, value]) => ({ name, value })),
    todayBirthdays: birthdaysRes.data ?? [],
  }
}
```

- [ ] **Step 2: Crear app/(dashboard)/page.tsx**

```tsx
// app/(dashboard)/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { MetricCard } from '@/components/shared/metric-card'
import { getDashboardData } from '@/lib/supabase/actions/dashboard'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function DashboardPage() {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null)

  useEffect(() => {
    if (!userData || !selectedLocation) return
    getDashboardData(userData.company.id, selectedLocation.location.id).then(setData)
  }, [userData, selectedLocation])

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard title="Clientes activos" value={data.totalClients} />
        <MetricCard title="Ingresos del mes" value={fmt(data.monthlyRevenue)} className="text-emerald-600" />
        <MetricCard title="Cumpleaños hoy" value={data.todayBirthdays.length} />
      </div>
      {data.todayBirthdays.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {data.todayBirthdays.map((c, i) => (
            <div key={i}>🎂 {c.name} {c.last_name}</div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add dashboard page with metrics"
```

---

### Task 12: Clients page + actions + create modal

**Files:**
- Create: `lib/supabase/actions/clients.ts`
- Create: `app/(dashboard)/clients/page.tsx`

- [ ] **Step 1: Crear lib/supabase/actions/clients.ts**

```typescript
// lib/supabase/actions/clients.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, subscriptions(id, end_date, is_sync, plans(name))`)
    .eq('company_id', companyId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createClientRecord(client: {
  name: string; last_name: string; email: string; phone_number: string;
  date_of_birth: string; gender: string; image_url?: string; company_id: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  return data
}

export async function createSubscription(sub: {
  client_id: number; plan_id: number; location_id: number;
  start_date: string; end_date: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('subscriptions').insert(sub).select().single()
  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 2: Crear app/(dashboard)/clients/page.tsx**

```tsx
// app/(dashboard)/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getClients } from '@/lib/supabase/actions/clients'
import { useAuthStore } from '@/stores/auth'
import { Plus } from 'lucide-react'

type Client = Awaited<ReturnType<typeof getClients>>[number]

function statusBadge(client: Client) {
  const sub = client.subscriptions?.[0]
  if (!sub || !(sub as any).is_sync) return <Badge variant="outline" className="text-yellow-600">Baja</Badge>
  const expired = new Date() > new Date((sub as any).end_date)
  return expired
    ? <Badge variant="destructive">Vencido</Badge>
    : <Badge className="bg-emerald-600">Vigente</Badge>
}

const columns: ColumnDef<Client>[] = [
  {
    header: 'Estado',
    cell: ({ row }) => statusBadge(row.original),
  },
  {
    header: 'Foto',
    cell: ({ row }) => (
      <Avatar className="h-6 w-6">
        <AvatarImage src={row.original.image_url ?? ''} />
        <AvatarFallback className="text-xs">
          {row.original.name?.[0]}{row.original.last_name?.[0]}
        </AvatarFallback>
      </Avatar>
    ),
  },
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'last_name', header: 'Apellido' },
  {
    header: 'Plan',
    cell: ({ row }) => (row.original.subscriptions as any)?.[0]?.plans?.name ?? '—',
  },
  { accessorKey: 'email', header: 'Email' },
  {
    header: 'Edad',
    cell: ({ row }) => row.original.date_of_birth
      ? new Date().getFullYear() - new Date(row.original.date_of_birth).getFullYear()
      : '—',
  },
]

export default function ClientsPage() {
  const { userData } = useAuthStore()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!userData) return
    getClients(userData.company.id).then(data => { setClients(data); setLoading(false) })
  }

  useEffect(load, [userData])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Clientes</h1>
        <Button size="sm" className="h-7 text-xs gap-1">
          <Plus size={13} /> Nuevo cliente
        </Button>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : (
        <DataTable columns={columns} data={clients} searchPlaceholder="Buscar cliente..." />
      )}
    </div>
  )
}
```

> **Nota:** El modal de creación de cliente (3 pasos: datos personales, biométricos via terminal, suscripción) se implementa como un `Sheet` de shadcn que se abre al hacer clic en "Nuevo cliente". La lógica de los 3 pasos sigue el mismo flujo que `CreateUserModal` en kraken-web. Este componente se agrega como `components/clients/create-client-sheet.tsx` en la misma tarea — ver paso siguiente.

- [ ] **Step 3: Crear components/clients/create-client-sheet.tsx**

```tsx
// components/clients/create-client-sheet.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClientRecord, createSubscription } from '@/lib/supabase/actions/clients'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  plans: { id: number; name: string; duration: string }[]
}

type Step1Data = { name: string; last_name: string; email: string; phone_number: string; date_of_birth: string; gender: string }
type Step3Data = { plan_id: number; start_date: string; end_date: string }

export function CreateClientSheet({ open, onClose, plans }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [step, setStep] = useState(0)
  const [step1, setStep1] = useState<Step1Data>({ name: '', last_name: '', email: '', phone_number: '', date_of_birth: '', gender: 'M' })
  const [step3, setStep3] = useState<Step3Data>({ plan_id: 0, start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!userData || !selectedLocation) return
    setLoading(true)
    try {
      const client = await createClientRecord({ ...step1, company_id: userData.company.id })
      await createSubscription({
        client_id: client.id,
        plan_id: step3.plan_id,
        location_id: selectedLocation.location.id,
        start_date: step3.start_date,
        end_date: step3.end_date,
      })
      toast.success('Cliente creado correctamente')
      setStep(0)
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-96">
        <SheetHeader><SheetTitle>Nuevo cliente — Paso {step + 1} de 3</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              {(['name','last_name','email','phone_number','date_of_birth'] as const).map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">{field.replace('_', ' ')}</Label>
                  <Input className="h-7 text-xs" value={step1[field]}
                    onChange={e => setStep1(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Género</Label>
                <Select value={step1.gender} onValueChange={v => setStep1(p => ({ ...p, gender: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="O">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {step === 1 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Registro biométrico via terminal Hikvision.</p>
              <p className="text-xs">El cliente se registrará primero en la DB. Luego podrás sincronizar huella y foto facial desde la pantalla de acciones del cliente.</p>
            </div>
          )}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Plan</Label>
                <Select value={String(step3.plan_id)} onValueChange={v => setStep3(p => ({ ...p, plan_id: Number(v) }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha inicio</Label>
                <Input type="date" className="h-7 text-xs" value={step3.start_date}
                  onChange={e => setStep3(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha fin</Label>
                <Input type="date" className="h-7 text-xs" value={step3.end_date}
                  onChange={e => setStep3(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            {step > 0 && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStep(p => p - 1)}>Atrás</Button>}
            {step < 2
              ? <Button size="sm" className="h-7 text-xs ml-auto" onClick={() => setStep(p => p + 1)}>Siguiente</Button>
              : <Button size="sm" className="h-7 text-xs ml-auto" onClick={handleSave} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
            }
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Conectar el sheet en clients/page.tsx**

En `app/(dashboard)/clients/page.tsx`, importar `CreateClientSheet` y `getPlans` de plans actions. Agregar `const [showCreate, setShowCreate] = useState(false)` y conectar el botón y el sheet.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add clients page with DataTable and create client sheet"
```

---

### Task 13: Payments page + actions

**Files:**
- Create: `lib/supabase/actions/payments.ts`
- Create: `app/(dashboard)/payments/page.tsx`

- [ ] **Step 1: Crear lib/supabase/actions/payments.ts**

```typescript
// lib/supabase/actions/payments.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPayments(locationId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`*, subscriptions(*, clients(*))`)
    .eq('location_id', locationId)
    .order('id', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createPayment(payment: {
  subscription_id: number
  amount: number
  payment_method: string
  location_id: number
  shift_id?: number | null
  registered_by?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      payment_date: new Date().toISOString(),
      registered_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/payments')
  return data
}

export async function getPaymentsByMonth(locationId: number, year: number, month: number) {
  const supabase = await createClient()
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  const { data, error } = await supabase
    .from('payments')
    .select(`*, subscriptions(*, clients(*), plans(*))`)
    .eq('location_id', locationId)
    .gte('payment_date', start)
    .lte('payment_date', end)
    .order('payment_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
```

- [ ] **Step 2: Crear app/(dashboard)/payments/page.tsx**

```tsx
// app/(dashboard)/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPayments } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Badge } from '@/components/ui/badge'

type Payment = Awaited<ReturnType<typeof getPayments>>[number]

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
}

const columns: ColumnDef<Payment>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  {
    header: 'Monto',
    cell: ({ row }) => row.original.amount
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.original.amount)
      : '—',
  },
  {
    header: 'Método',
    cell: ({ row }) => {
      const m = row.original.payment_method ?? ''
      return <Badge variant="outline">{methodLabel[m] ?? m}</Badge>
    },
  },
  { accessorKey: 'payment_date', header: 'Fecha', cell: ({ row }) => row.original.payment_date?.split('T')[0] ?? '—' },
  {
    header: 'Turno',
    cell: ({ row }) => (row.original as any).shift_id ?? '—',
  },
]

export default function PaymentsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedLocation) return
    getPayments(selectedLocation.location.id).then(d => { setPayments(d); setLoading(false) })
  }, [selectedLocation])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Pagos</h1>
      {loading ? <p className="text-xs text-muted-foreground">Cargando...</p>
        : <DataTable columns={columns} data={payments} searchPlaceholder="Buscar pago..." />}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add payments page and actions with shift/registered_by columns"
```

---

### Task 14: Plans, Locations, Reports pages

**Files:**
- Create: `lib/supabase/actions/plans.ts`
- Create: `lib/supabase/actions/locations.ts`
- Create: `app/(dashboard)/plans/page.tsx`
- Create: `app/(dashboard)/locations/page.tsx`
- Create: `app/(dashboard)/reports/page.tsx`
- Create: `app/(dashboard)/reports/monthly-payments/page.tsx`

- [ ] **Step 1: Crear lib/supabase/actions/plans.ts**

```typescript
// lib/supabase/actions/plans.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPlans(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('plans').select('*').eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertPlan(plan: {
  id?: number; name: string; price: number; duration: string;
  description?: string; access_level: string; access_start_time?: string | null;
  access_end_time?: string | null; company_id: number
}) {
  const supabase = await createClient()
  const { error } = plan.id
    ? await supabase.from('plans').update(plan).eq('id', plan.id)
    : await supabase.from('plans').insert(plan)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function deletePlan(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}
```

- [ ] **Step 2: Crear lib/supabase/actions/locations.ts**

```typescript
// lib/supabase/actions/locations.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLocations(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('locations').select('*').eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertLocation(location: {
  id?: number; name: string; address?: string; city?: string; zip_code?: string; company_id: number
}) {
  const supabase = await createClient()
  const { error } = location.id
    ? await supabase.from('locations').update(location).eq('id', location.id)
    : await supabase.from('locations').insert(location)
  if (error) throw new Error(error.message)
  revalidatePath('/locations')
}
```

- [ ] **Step 3: Crear app/(dashboard)/plans/page.tsx**

```tsx
// app/(dashboard)/plans/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getPlans } from '@/lib/supabase/actions/plans'
import { useAuthStore } from '@/stores/auth'

type Plan = Awaited<ReturnType<typeof getPlans>>[number]

const columns: ColumnDef<Plan>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'price', header: 'Precio', cell: ({ row }) =>
    row.original.price
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(row.original.price)
      : '—' },
  { accessorKey: 'duration', header: 'Duración' },
  { accessorKey: 'access_level', header: 'Acceso' },
  { accessorKey: 'description', header: 'Descripción' },
]

export default function PlansPage() {
  const { userData } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    if (!userData) return
    getPlans(userData.company.id).then(setPlans)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Planes</h1>
      <DataTable columns={columns} data={plans} searchPlaceholder="Buscar plan..." />
    </div>
  )
}
```

- [ ] **Step 4: Crear app/(dashboard)/locations/page.tsx**

```tsx
// app/(dashboard)/locations/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { getLocations } from '@/lib/supabase/actions/locations'
import { useAuthStore } from '@/stores/auth'

type Location = Awaited<ReturnType<typeof getLocations>>[number]

const columns: ColumnDef<Location>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'city', header: 'Ciudad' },
  { accessorKey: 'address', header: 'Dirección' },
  { accessorKey: 'zip_code', header: 'CP' },
]

export default function LocationsPage() {
  const { userData } = useAuthStore()
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    if (!userData) return
    getLocations(userData.company.id).then(setLocations)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Ubicaciones</h1>
      <DataTable columns={columns} data={locations} />
    </div>
  )
}
```

- [ ] **Step 5: Crear app/(dashboard)/reports/page.tsx**

```tsx
// app/(dashboard)/reports/page.tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react'

const reports = [
  { title: 'Pagos Mensuales', description: 'Pagos recibidos por mes', href: '/reports/monthly-payments', icon: DollarSign, enabled: true },
  { title: 'Altas de Clientes', description: 'Clientes dados de alta en terminal', href: '#', icon: Users, enabled: false },
  { title: 'Ingresos por Plan', description: 'Análisis por tipo de membresía', href: '#', icon: TrendingUp, enabled: false },
  { title: 'Reporte General', description: 'Vista general de métricas', href: '#', icon: BarChart3, enabled: false },
]

export default function ReportsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Reportes</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {reports.map(r => {
          const Icon = r.icon
          return (
            <Card key={r.href} className={r.enabled ? '' : 'opacity-50'}>
              <CardContent className="p-4">
                {r.enabled ? (
                  <Link href={r.href} className="block space-y-1 hover:text-emerald-600">
                    <Icon size={18} className="text-emerald-600" />
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </Link>
                ) : (
                  <div className="space-y-1">
                    <Icon size={18} className="text-muted-foreground" />
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                    <span className="text-xs text-yellow-600">Próximamente</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Crear app/(dashboard)/reports/monthly-payments/page.tsx**

```tsx
// app/(dashboard)/reports/monthly-payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { getPaymentsByMonth } from '@/lib/supabase/actions/payments'
import { usePreferencesStore } from '@/stores/preferences'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Payment = Awaited<ReturnType<typeof getPaymentsByMonth>>[number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Payment>[] = [
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  {
    header: 'Plan',
    cell: ({ row }) => (row.original.subscriptions as any)?.plans?.name ?? '—',
  },
  {
    header: 'Monto',
    cell: ({ row }) => row.original.amount ? fmt(row.original.amount) : '—',
  },
  { accessorKey: 'payment_method', header: 'Método' },
  { accessorKey: 'payment_date', header: 'Fecha', cell: ({ row }) => row.original.payment_date?.split('T')[0] ?? '—' },
]

export default function MonthlyPaymentsPage() {
  const { selectedLocation } = usePreferencesStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (!selectedLocation) return
    getPaymentsByMonth(selectedLocation.location.id, year, month).then(setPayments)
  }, [selectedLocation, year, month])

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Pagos Mensuales</h1>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear(), now.getFullYear() - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="Total del mes" value={fmt(total)} />
        <MetricCard title="Número de pagos" value={payments.length} />
      </div>
      <DataTable columns={columns} data={payments} />
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add plans, locations and reports pages"
```

---

## Phase 4: New features

### Task 15: Shifts pages (lista + detalle + cierre)

**Files:**
- Create: `app/(dashboard)/shifts/page.tsx`
- Create: `app/(dashboard)/shifts/[id]/page.tsx`

- [ ] **Step 1: Crear app/(dashboard)/shifts/page.tsx**

```tsx
// app/(dashboard)/shifts/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getShifts, openShift, getActiveShift } from '@/lib/supabase/actions/shifts'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'
import Link from 'next/link'

type Shift = Awaited<ReturnType<typeof getShifts>>[number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Shift>[] = [
  { accessorKey: 'id', header: 'ID', size: 50 },
  { accessorKey: 'opened_at', header: 'Apertura', cell: ({ row }) => row.original.opened_at?.replace('T', ' ').slice(0, 16) },
  { accessorKey: 'closed_at', header: 'Cierre', cell: ({ row }) =>
    row.original.closed_at ? row.original.closed_at.replace('T', ' ').slice(0, 16) : <Badge className="bg-emerald-600">Activo</Badge> },
  { accessorKey: 'cash_amount', header: 'Efectivo', cell: ({ row }) => fmt(row.original.cash_amount ?? 0) },
  { accessorKey: 'card_amount', header: 'Tarjeta', cell: ({ row }) => fmt(row.original.card_amount ?? 0) },
  { accessorKey: 'total_amount', header: 'Total', cell: ({ row }) => fmt(row.original.total_amount ?? 0) },
  {
    header: '',
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/shifts/${row.original.id}`}>
        <Button variant="ghost" size="sm" className="h-6 text-xs">Ver detalle</Button>
      </Link>
    ),
  },
]

export default function ShiftsPage() {
  const { role } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [hasActive, setHasActive] = useState(false)
  const [opening, setOpening] = useState(false)

  const load = async () => {
    if (!selectedLocation) return
    const data = await getShifts(selectedLocation.location.id)
    setShifts(data)
    const active = await getActiveShift(selectedLocation.location.id)
    setHasActive(!!active)
  }

  useEffect(() => { load() }, [selectedLocation])

  const handleOpen = async () => {
    if (!selectedLocation) return
    setOpening(true)
    const { error } = await openShift(selectedLocation.location.id)
    if (error) toast.error(error)
    else toast.success('Turno abierto')
    await load()
    setOpening(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Turnos</h1>
        {!hasActive && (
          <Button size="sm" className="h-7 text-xs" onClick={handleOpen} disabled={opening}>
            {opening ? 'Abriendo...' : 'Abrir turno'}
          </Button>
        )}
        {hasActive && <Badge className="bg-emerald-600">Turno activo</Badge>}
      </div>
      <DataTable columns={columns} data={shifts} />
    </div>
  )
}
```

- [ ] **Step 2: Crear lib/supabase/actions/shifts.ts — agregar getShiftDetail**

Agregar al final del archivo `lib/supabase/actions/shifts.ts` existente:

```typescript
export async function getShiftDetail(shiftId: number) {
  const supabase = await createClient()
  const [shiftRes, paymentsRes] = await Promise.all([
    supabase.from('shifts').select('*').eq('id', shiftId).single(),
    supabase
      .from('payments')
      .select(`*, subscriptions(*, clients(*))`)
      .eq('shift_id', shiftId)
      .order('payment_date', { ascending: true }),
  ])
  if (shiftRes.error) throw new Error(shiftRes.error.message)
  return { shift: shiftRes.data, payments: paymentsRes.data ?? [] }
}
```

- [ ] **Step 3: Crear app/(dashboard)/shifts/[id]/page.tsx**

```tsx
// app/(dashboard)/shifts/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from '@/components/shared/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getShiftDetail, closeShift, getActiveShift } from '@/lib/supabase/actions/shifts'
import { usePreferencesStore } from '@/stores/preferences'
import { toast } from 'sonner'

type Detail = Awaited<ReturnType<typeof getShiftDetail>>
type Payment = Detail['payments'][number]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

const columns: ColumnDef<Payment>[] = [
  {
    header: 'Cliente',
    cell: ({ row }) => {
      const c = (row.original.subscriptions as any)?.clients
      return c ? `${c.name} ${c.last_name}` : '—'
    },
  },
  { header: 'Monto', cell: ({ row }) => fmt(row.original.amount ?? 0) },
  { accessorKey: 'payment_method', header: 'Método' },
  { accessorKey: 'payment_date', header: 'Hora', cell: ({ row }) => row.original.payment_date?.slice(11, 16) ?? '—' },
]

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { selectedLocation } = usePreferencesStore()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [isMyActiveShift, setIsMyActiveShift] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')

  const load = async () => {
    const data = await getShiftDetail(Number(id))
    setDetail(data)
    if (selectedLocation) {
      const active = await getActiveShift(selectedLocation.location.id)
      setIsMyActiveShift(active?.id === Number(id))
    }
  }

  useEffect(() => { load() }, [id])

  const handleClose = async () => {
    setClosing(true)
    const { error } = await closeShift(Number(id), notes || undefined)
    if (error) { toast.error(error); setClosing(false); return }
    toast.success('Turno cerrado correctamente')
    router.push('/shifts')
  }

  if (!detail) return <p className="text-xs text-muted-foreground p-4">Cargando...</p>

  const { shift, payments } = detail
  const isOpen = !shift.closed_at

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Turno #{shift.id}</h1>
        {isOpen ? <Badge className="bg-emerald-600">Activo</Badge> : <Badge variant="outline">Cerrado</Badge>}
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Apertura: {shift.opened_at?.replace('T', ' ').slice(0, 16)}</div>
        {shift.closed_at && <div>Cierre: {shift.closed_at.replace('T', ' ').slice(0, 16)}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Efectivo" value={fmt(shift.cash_amount ?? 0)} />
        <MetricCard title="Tarjeta" value={fmt(shift.card_amount ?? 0)} />
        <MetricCard title="Otros" value={fmt(shift.other_amount ?? 0)} />
        <MetricCard title="Total" value={fmt(shift.total_amount ?? 0)} />
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Pagos del turno ({payments.length})</h2>
        <DataTable columns={columns} data={payments} />
      </div>

      {isMyActiveShift && (
        <div className="space-y-2 pt-2">
          <Separator />
          <p className="text-sm font-medium">Cerrar turno</p>
          <textarea
            className="w-full text-xs border rounded p-2 resize-none h-16 bg-background"
            placeholder="Notas opcionales..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <Button onClick={handleClose} disabled={closing} variant="destructive" size="sm" className="h-7 text-xs">
            {closing ? 'Cerrando...' : 'Confirmar cierre de turno'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add shifts list and detail pages with close flow"
```

---

### Task 16: Workers page + actions

**Files:**
- Create: `lib/supabase/actions/workers.ts`
- Create: `app/(dashboard)/workers/page.tsx`

- [ ] **Step 1: Crear lib/supabase/actions/workers.ts**

```typescript
// lib/supabase/actions/workers.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWorkers(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_access')
    .select('id, role, user_id, location:locations(id, name)')
    .eq('company_id', companyId)
    .in('role', ['admin', 'worker'])
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function inviteWorker(email: string, companyId: number, locationId: number, role: 'admin' | 'worker'): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
  if (inviteError) return { error: inviteError.message }

  const { error: accessError } = await supabase.from('user_access').insert({
    user_id: invited.user.id,
    company_id: companyId,
    location_id: locationId,
    role,
  })
  if (accessError) return { error: accessError.message }

  revalidatePath('/workers')
  return { error: null }
}
```

- [ ] **Step 2: Crear app/(dashboard)/workers/page.tsx**

```tsx
// app/(dashboard)/workers/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { getWorkers } from '@/lib/supabase/actions/workers'
import { useAuthStore } from '@/stores/auth'

type Worker = Awaited<ReturnType<typeof getWorkers>>[number]

const columns: ColumnDef<Worker>[] = [
  { accessorKey: 'user_id', header: 'User ID', cell: ({ row }) => row.original.user_id?.slice(0, 8) + '...' },
  {
    header: 'Rol',
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
        {row.original.role}
      </Badge>
    ),
  },
  {
    header: 'Ubicación',
    cell: ({ row }) => (row.original.location as any)?.name ?? '—',
  },
]

export default function WorkersPage() {
  const { userData } = useAuthStore()
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    if (!userData) return
    getWorkers(userData.company.id).then(setWorkers)
  }, [userData])

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Trabajadores</h1>
      <DataTable columns={columns} data={workers} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add workers page and actions"
```

---

### Task 17: Terminal adapter + API route + page

**Files:**
- Create: `lib/terminal.ts`
- Create: `app/api/terminal/route.ts`
- Create: `app/(dashboard)/terminal/page.tsx`

- [ ] **Step 1: Crear lib/terminal.ts (copiar de kraken-web con ajuste de URL)**

```typescript
// lib/terminal.ts
export class Terminal {
  static get url() {
    if (typeof window === 'undefined') return 'http://localhost:8000'
    return localStorage.getItem('agentIp') || 'http://localhost:8000'
  }

  static get networkData() {
    if (typeof window === 'undefined') return { terminal_url: '', username: 'admin', password: 'admin' }
    return {
      terminal_url: localStorage.getItem('terminalIp') || '',
      username: localStorage.getItem('terminalUsername') || 'admin',
      password: localStorage.getItem('terminalPassword') || 'admin',
    }
  }

  static async getCapabilities() {
    const res = await fetch(`${this.url}/`)
    return res.text()
  }

  static async readFingerPrint() {
    const res = await fetch(`${this.url}/hikvision/capture-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    const data = await res.json()
    return data.CaptureFingerPrint
  }

  static async createPerson(req: Record<string, unknown>) {
    const res = await fetch(`${this.url}/hikvision/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    return res.json()
  }

  static async setUpFingerPrint(id: string, fingerprint: string) {
    const res = await fetch(`${this.url}/hikvision/setup-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fingerprint, ...this.networkData }),
    })
    return res.json()
  }

  static async setUpFaceImage(id: string, image_url: string) {
    const res = await fetch(`${this.url}/hikvision/setup-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, image_url, ...this.networkData }),
    })
    return res.json()
  }

  static async updateEndDate(req: Record<string, unknown>) {
    const res = await fetch(`${this.url}/hikvision/update-end-date`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    return res.json()
  }

  static async openDoor() {
    const res = await fetch(`${this.url}/hikvision/open-door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    return res.json()
  }

  static async deleteUser(userId: string) {
    const res = await fetch(`${this.url}/hikvision/delete-user`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...this.networkData }),
    })
    return res.json()
  }
}
```

- [ ] **Step 2: Crear app/api/terminal/route.ts**

```typescript
// app/api/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server'

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? ''
  const body = await request.json()

  try {
    const res = await fetch(`${AGENT_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Agent unreachable' }, { status: 503 })
  }
}
```

- [ ] **Step 3: Crear app/(dashboard)/terminal/page.tsx**

```tsx
// app/(dashboard)/terminal/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Terminal } from '@/lib/terminal'
import { toast } from 'sonner'

export default function TerminalPage() {
  const [agentIp, setAgentIp] = useState('')
  const [terminalIp, setTerminalIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')

  useEffect(() => {
    setAgentIp(localStorage.getItem('agentIp') || '')
    setTerminalIp(localStorage.getItem('terminalIp') || '')
    setUsername(localStorage.getItem('terminalUsername') || '')
    setPassword(localStorage.getItem('terminalPassword') || '')
  }, [])

  const handleSave = () => {
    localStorage.setItem('agentIp', agentIp)
    localStorage.setItem('terminalIp', terminalIp)
    localStorage.setItem('terminalUsername', username)
    localStorage.setItem('terminalPassword', password)
    toast.success('Configuración guardada')
  }

  const handleCheck = async () => {
    try {
      await Terminal.getCapabilities()
      setStatus('online')
    } catch {
      setStatus('offline')
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold flex-1">Configuración Terminal</h1>
        {status !== 'unknown' && (
          <Badge variant={status === 'online' ? 'default' : 'destructive'} className={status === 'online' ? 'bg-emerald-600' : ''}>
            {status === 'online' ? 'Online' : 'Offline'}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {[
          { label: 'Agent IP', value: agentIp, setter: setAgentIp, placeholder: 'http://localhost:8000' },
          { label: 'Terminal IP', value: terminalIp, setter: setTerminalIp, placeholder: '192.168.1.100' },
          { label: 'Usuario Terminal', value: username, setter: setUsername, placeholder: 'admin' },
          { label: 'Contraseña Terminal', value: password, setter: setPassword, placeholder: '••••••••', type: 'password' },
        ].map(field => (
          <div key={field.label} className="space-y-1">
            <Label className="text-xs">{field.label}</Label>
            <Input
              className="h-7 text-xs"
              type={(field as any).type ?? 'text'}
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Guardar</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCheck}>Verificar conexión</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add terminal adapter, API proxy route and terminal config page"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Next.js 15, App Router, shadcn/ui, Tailwind emerald | Task 1, 2 |
| Supabase SSR cookie-based auth | Task 3, 6 |
| Zustand stores (auth + preferences) | Task 4 |
| DB: shifts table + payments.shift_id + registered_by | Task 5 |
| Middleware auth + role routing (admin/worker) | Task 6 |
| Login page | Task 7 |
| Sidebar mini colapsable + topbar | Task 8 |
| ShiftBlocker modal (WORKER gate) | Task 9 |
| Shared DataTable data-dense | Task 10 |
| Dashboard con métricas | Task 11 |
| Clientes page + create modal 3 pasos | Task 12 |
| Pagos + registered_by + shift_id | Task 13 |
| Planes CRUD | Task 14 |
| Ubicaciones | Task 14 |
| Reportes (pagos mensuales) | Task 14 |
| Shifts lista + detalle + cierre | Task 15 |
| Workers page | Task 16 |
| Terminal adapter + proxy + página config | Task 17 |
| computeShiftTotals con tests | Task 5 |
| WORKER logout bloqueado con turno activo | Task 8 (topbar shift warning) |
| Turno obligatorio al login para WORKER | Task 9 + dashboard layout Task 8 |
| Dark/light mode toggle | Task 2, 8 |

**Gaps encontrados y corregidos:**
- `registered_by` en `createPayment` → incluido en Task 13 (se toma del user autenticado)
- `getActiveShift` exportado desde `shifts.ts` para uso en dashboard layout → incluido en Task 9
- `getShiftDetail` necesitaba ser agregado a shifts.ts existente → indicado en Task 15 Step 2

**Type consistency:** `computeShiftTotals` retorna `ShiftTotals` usado en `closeShift` via spread `...totals` — consistente. `UserData`, `UserAccess`, `Company`, `Location` definidos en `stores/auth.ts` y referenciados en `actions/auth.ts` — consistente.

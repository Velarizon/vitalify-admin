# Vitalify Admin v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseño visual premium (Neon Dark), catálogos CRUD funcionales, wizard de alta de clientes con biométricos, paginación, filtros, y diseño responsivo.

**Architecture:** Todos los cambios son sobre la app existente (Next.js 15 App Router). El design system se implementa via CSS variables en globals.css. Los catálogos usan server actions + shadcn modals. El wizard de cliente usa un Sheet lateral con 3 pasos y se comunica con el agente Hikvision local vía la clase Terminal (client-side fetch, misma arquitectura que kraken-web).

**Tech Stack:** Next.js 15, React 19, shadcn/ui, Tailwind CSS v4, Supabase SSR, Zustand, react-webcam, qrcode.react, date-fns

**Spec:** `docs/superpowers/specs/2026-04-14-vitalify-admin-v2-design.md`

---

## File Map

```
Modify: app/globals.css                          # Neon Dark CSS variables
Modify: app/layout.tsx                           # Force dark, remove theme toggle
Modify: app/(auth)/login/page.tsx                # Neon dark palette
Modify: app/(dashboard)/layout.tsx               # Responsive sidebar + mobile hamburger
Modify: components/layout/sidebar.tsx            # Expanded/collapsed/mobile overlay
Modify: components/layout/topbar.tsx             # Remove theme toggle, add mobile hamburger
Modify: components/shared/data-table.tsx         # Pagination bar + page size + responsive
Modify: components/shared/metric-card.tsx        # Uppercase label style
Modify: app/(dashboard)/plans/page.tsx           # CRUD + toggle active
Modify: app/(dashboard)/locations/page.tsx       # CRUD modal
Modify: app/(dashboard)/workers/page.tsx         # Invite modal + deactivate
Modify: app/(dashboard)/terminal/page.tsx        # Config form + test connection
Modify: app/(dashboard)/reports/page.tsx         # Replace emerald hardcodes
Modify: app/(dashboard)/reports/monthly-payments/page.tsx  # CSV export + summary cards
Modify: app/(dashboard)/clients/page.tsx         # Use new wizard
Modify: lib/terminal.ts                          # Full rewrite matching kraken-web
Modify: lib/supabase/actions/plans.ts            # togglePlanActive
Modify: lib/supabase/actions/workers.ts          # updateWorker, deactivateWorker
Modify: lib/supabase/actions/locations.ts        # (already has upsertLocation)
Modify: stores/preferences.ts                    # Add sidebarOpen state
Create: components/clients/create-client-wizard.tsx  # 3-step wizard (replaces old sheet)
Create: components/clients/step-personal.tsx     # Step 1
Create: components/clients/step-biometrics.tsx   # Step 2
Create: components/clients/step-plan-payment.tsx # Step 3
Create: components/clients/wizard-stepper.tsx    # Visual stepper header
Create: app/api/receipt-upload/route.ts          # QR receipt upload endpoint
```

---

## Wave 1 — Foundation (parallelizable, no interdependencies)

### Task 18: Neon Dark Theme (Gemini)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace CSS variables in globals.css**

Replace the `:root` and `.dark` blocks in `app/globals.css` (lines 51–118) with:

```css
:root {
  --background: #041210;
  --foreground: #FFFFFF;
  --card: #0B221E;
  --card-foreground: #FFFFFF;
  --popover: #0C2B27;
  --popover-foreground: #FFFFFF;
  --primary: #00FF9D;
  --primary-foreground: #041210;
  --secondary: #1A3835;
  --secondary-foreground: #FFFFFF;
  --muted: #1A3835;
  --muted-foreground: #8E9B99;
  --accent: #00FF9D;
  --accent-foreground: #041210;
  --destructive: #FF453A;
  --destructive-foreground: #FFFFFF;
  --border: #1A3835;
  --input: #0C2B27;
  --ring: #00FF9D;
  --chart-1: #00FF9D;
  --chart-2: #FF9F0A;
  --chart-3: #64D2FF;
  --chart-4: #BF5AF2;
  --chart-5: #FF375F;
  --radius: 0.625rem;
  --sidebar: #0B221E;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #00FF9D;
  --sidebar-primary-foreground: #041210;
  --sidebar-accent: #1A3835;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #1A3835;
  --sidebar-ring: #00FF9D;
}

.dark {
  --background: #041210;
  --foreground: #FFFFFF;
  --card: #0B221E;
  --card-foreground: #FFFFFF;
  --popover: #0C2B27;
  --popover-foreground: #FFFFFF;
  --primary: #00FF9D;
  --primary-foreground: #041210;
  --secondary: #1A3835;
  --secondary-foreground: #FFFFFF;
  --muted: #1A3835;
  --muted-foreground: #8E9B99;
  --accent: #00FF9D;
  --accent-foreground: #041210;
  --destructive: #FF453A;
  --destructive-foreground: #FFFFFF;
  --border: #1A3835;
  --input: #0C2B27;
  --ring: #00FF9D;
  --chart-1: #00FF9D;
  --chart-2: #FF9F0A;
  --chart-3: #64D2FF;
  --chart-4: #BF5AF2;
  --chart-5: #FF375F;
  --sidebar: #0B221E;
  --sidebar-foreground: #FFFFFF;
  --sidebar-primary: #00FF9D;
  --sidebar-primary-foreground: #041210;
  --sidebar-accent: #1A3835;
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #1A3835;
  --sidebar-ring: #00FF9D;
}
```

- [ ] **Step 2: Force dark mode in layout.tsx**

In `app/layout.tsx`, change the ThemeProvider to force dark:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: apply Neon Dark theme — replace emerald palette with #00FF9D/#041210"
```

---

### Task 19: Terminal Class Rewrite (Codex)

**Files:**
- Modify: `lib/terminal.ts`

- [ ] **Step 1: Replace lib/terminal.ts with kraken-web's Terminal class**

Replace the entire file with:

```typescript
// lib/terminal.ts
class Terminal {
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

  static async getCapabilities(): Promise<string> {
    const response = await fetch(`${this.url}/`)
    return response.text()
  }

  static async readFingerPrint() {
    const response = await fetch(`${this.url}/hikvision/capture-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    const data = await response.json()
    return data.CaptureFingerPrint
  }

  static async createPerson(req: {
    name: string; employeeNo: string; userType: string;
    beginTime: string; endTime: string;
  }) {
    const response = await fetch(`${this.url}/hikvision/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    return response.json()
  }

  static async setUpFingerPrint(id: string, fingerprint: string) {
    const response = await fetch(`${this.url}/hikvision/setup-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fingerprint, ...this.networkData }),
    })
    return response.json()
  }

  static async setUpFaceImage(id: string, image_url: string) {
    const response = await fetch(`${this.url}/hikvision/setup-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, image_url, ...this.networkData }),
    })
    return response.json()
  }

  static async updateEndDate(req: { employeeNo: string; endTime: string }) {
    const response = await fetch(`${this.url}/hikvision/update-end-date`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    return response.json()
  }

  static async openDoor() {
    const response = await fetch(`${this.url}/hikvision/open-door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    return response.json()
  }

  static async deleteUser(userId: string) {
    const response = await fetch(`${this.url}/hikvision/delete-user`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...this.networkData }),
    })
    return response.json()
  }
}

export { Terminal }
export default Terminal
```

- [ ] **Step 2: Commit**

```bash
git add lib/terminal.ts
git commit -m "feat: rewrite Terminal class matching kraken-web — all Hikvision endpoints"
```

---

### Task 20: Plans Migration + togglePlanActive (Codex)

**Files:**
- Modify: `lib/supabase/actions/plans.ts`

- [ ] **Step 1: Run migration in Supabase SQL Editor**

```sql
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

- [ ] **Step 2: Add togglePlanActive to plans.ts**

Append to `lib/supabase/actions/plans.ts`:

```typescript
export async function togglePlanActive(planId: number, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('plans')
    .update({ is_active: isActive })
    .eq('id', planId)
  if (error) throw new Error(error.message)
  revalidatePath('/plans')
}

export async function getActivePlans(companyId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return data ?? []
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/actions/plans.ts
git commit -m "feat: add togglePlanActive and getActivePlans server actions"
```

---

### Task 21: DataTable Pagination Upgrade (Claude)

**Files:**
- Modify: `components/shared/data-table.tsx`

- [ ] **Step 1: Update DataTable with pagination bar + page size + responsive wrapper**

Replace the entire file `components/shared/data-table.tsx` with:

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [pageSize, setPageSize] = useState(50)

  const table = useReactTable({
    data, columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const totalRows = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const currentPageSize = table.getState().pagination.pageSize
  const start = pageIndex * currentPageSize + 1
  const end = Math.min((pageIndex + 1) * currentPageSize, totalRows)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="h-8 w-56 text-xs"
        />
        {toolbar}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="h-8 text-[10px] uppercase tracking-wider px-3 text-muted-foreground">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="h-9">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-1 px-3 text-xs">
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
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <span>
          {totalRows > 0 ? `Mostrando ${start}–${end} de ${totalRows}` : '0 resultados'}
        </span>
        <div className="flex items-center gap-2">
          <Select value={String(currentPageSize)} onValueChange={v => { setPageSize(Number(v)); table.setPageSize(Number(v)) }}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/data-table.tsx
git commit -m "feat: upgrade DataTable — pagination bar, page size selector, responsive scroll"
```

---

### Task 22: Sidebar Preferences Store (Claude)

**Files:**
- Modify: `stores/preferences.ts`

- [ ] **Step 1: Add sidebarOpen to preferences store**

In `stores/preferences.ts`, add `sidebarOpen` field:

```typescript
// stores/preferences.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserAccess } from './auth'

interface PreferencesStore {
  selectedLocation: UserAccess | null
  setSelectedLocation: (location: UserAccess | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      selectedLocation: null,
      setSelectedLocation: (location) => set({ selectedLocation: location }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    { name: 'user-preferences' }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add stores/preferences.ts
git commit -m "feat: add sidebarOpen state to preferences store"
```

---

## Wave 2 — Layout + CRUD Pages (depends on Wave 1)

### Task 23: Sidebar Redesign (Gemini)

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar with expanded/collapsed/mobile states**

Replace the entire file `components/layout/sidebar.tsx` with:

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, Menu, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

const generalItems = [
  { label: 'Dashboard',  href: '/',         icon: Home },
  { label: 'Clientes',   href: '/clients',  icon: Users },
  { label: 'Pagos',      href: '/payments', icon: CreditCard },
  { label: 'Turnos',     href: '/shifts',   icon: Timer },
]

const adminItems = [
  { label: 'Planes',       href: '/plans',     icon: ClipboardList },
  { label: 'Ubicaciones',  href: '/locations', icon: MapPin },
  { label: 'Reportes',     href: '/reports',   icon: BarChart3 },
  { label: 'Trabajadores', href: '/workers',   icon: UserCog },
  { label: 'Terminal',     href: '/terminal',  icon: Fingerprint },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useAuthStore()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePreferencesStore()
  const navItems = role === 'admin' ? [...generalItems, ...adminItems] : generalItems
  const showAdmin = role === 'admin'

  const renderItem = (item: typeof generalItems[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false) }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-secondary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Link>
        </TooltipTrigger>
        {!sidebarOpen && (
          <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
        )}
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r border-border flex flex-col z-40 transition-all duration-200',
          sidebarOpen ? 'w-[180px]' : 'w-12',
          // Mobile: hidden when closed
          !sidebarOpen && 'max-md:-translate-x-full'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center h-12 px-2 border-b border-border', sidebarOpen ? 'justify-between' : 'justify-center')}>
          {sidebarOpen && <span className="font-bold text-primary text-sm ml-1">⚡ Vitalify</span>}
          <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            {sidebarOpen ? <X size={16} className="text-muted-foreground" /> : <Menu size={16} className="text-muted-foreground" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
          {generalItems.map(renderItem)}
          {showAdmin && (
            <>
              <div className="my-2 mx-2 border-t border-border" />
              {adminItems.map(renderItem)}
            </>
          )}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: redesign sidebar — expanded/collapsed with hamburger, mobile overlay"
```

---

### Task 24: Topbar Redesign (Gemini)

**Files:**
- Modify: `components/layout/topbar.tsx`

- [ ] **Step 1: Update topbar — remove theme toggle, add mobile hamburger**

Replace the entire file `components/layout/topbar.tsx`. Key changes:
- Remove `useTheme` import and theme toggle button.
- Add hamburger button for mobile (visible only on `md:hidden`).
- Use semantic CSS vars instead of emerald hardcodes.

```tsx
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

  const sidebarWidth = sidebarOpen ? 180 : 48

  return (
    <>
      <header
        className="fixed top-0 right-0 h-12 bg-card border-b border-border flex items-center px-4 gap-3 z-30 transition-all duration-200"
        style={{ left: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : sidebarWidth }}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "feat: redesign topbar — neon dark, mobile hamburger, remove theme toggle"
```

---

### Task 25: Dashboard Layout Update (Gemini)

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update layout to use new sidebar props and responsive margins**

The layout needs to read `sidebarOpen` from store and pass it to the sidebar. Update `app/(dashboard)/layout.tsx`:

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [activeShift, setActiveShift] = useState<{ id: number; opened_at: string } | null>(null)
  const [shiftChecked, setShiftChecked] = useState(false)
  const { role } = useAuthStore()
  const { selectedLocation, sidebarOpen } = usePreferencesStore()

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
      <Sidebar />
      <Topbar
        hasActiveShift={!!activeShift}
        activeShiftOpenedAt={activeShift?.opened_at}
        onOpenDoor={handleOpenDoor}
      />
      <main
        className="pt-12 min-h-screen transition-all duration-200 max-md:ml-0"
        style={{ marginLeft: sidebarOpen ? 180 : 48 }}
      >
        <div className="p-4 md:p-6">{children}</div>
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

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: update dashboard layout — responsive sidebar margins, simplified topbar props"
```

---

### Task 26: Plans CRUD Page (Codex)

**Files:**
- Modify: `app/(dashboard)/plans/page.tsx`

- [ ] **Step 1: Rewrite plans page with create/edit modal + active toggle**

shadcn `Switch` component needed — install first:

```bash
npx shadcn@latest add switch
```

Then replace `app/(dashboard)/plans/page.tsx` with full CRUD page:
- Switch toggle for is_active in table
- "Nuevo plan" button → Dialog with form
- Edit button per row → same Dialog
- Calls `upsertPlan`, `togglePlanActive` from `lib/supabase/actions/plans.ts`

The page should import: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger` from `@/components/ui/dialog`, `Switch` from `@/components/ui/switch`, plus existing `DataTable`, `Button`, `Input`, `Label`, `Select` components.

Columns: Nombre, Duración, Precio, Acceso, Estado (Switch), Acciones (Editar button).

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/plans/page.tsx" components/ui/switch.tsx
git commit -m "feat: plans CRUD — create/edit modal, active toggle switch"
```

---

### Task 27: Locations CRUD Page (Codex)

**Files:**
- Modify: `app/(dashboard)/locations/page.tsx`

- [ ] **Step 1: Rewrite locations page with create/edit modal**

Add "Nueva ubicación" button and edit button per row. Modal with fields: name, address, city, zip_code. Calls `upsertLocation` from `lib/supabase/actions/locations.ts`.

Columns: Nombre, Ciudad, Dirección, CP, Acciones (Editar).

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/locations/page.tsx"
git commit -m "feat: locations CRUD — create/edit modal"
```

---

### Task 28: Workers CRUD Page (Codex)

**Files:**
- Modify: `app/(dashboard)/workers/page.tsx`
- Modify: `lib/supabase/actions/workers.ts`

- [ ] **Step 1: Add updateWorker and deactivateWorker to workers.ts**

Append to `lib/supabase/actions/workers.ts`:

```typescript
export async function updateWorker(id: number, data: { role?: string; location_id?: number }): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('user_access').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/workers')
  return { error: null }
}

export async function deactivateWorker(id: number): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('user_access').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/workers')
  return { error: null }
}
```

- [ ] **Step 2: Rewrite workers page with invite modal + deactivate**

Add "Invitar trabajador" button → Dialog with email, role (select), location (select, populated from `getLocations`). Deactivate button per row with confirmation dialog. Edit role/location inline or via modal.

Columns: Email (fetch from user_id display), Rol (Badge), Ubicación, Acciones (Editar, Desactivar).

Note: `inviteWorker` requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Add it:
```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API → service_role>
```

And create an admin Supabase client in the server action that uses this key.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/actions/workers.ts "app/(dashboard)/workers/page.tsx"
git commit -m "feat: workers CRUD — invite, edit role/location, deactivate"
```

---

### Task 29: Terminal Config Page (Codex)

**Files:**
- Modify: `app/(dashboard)/terminal/page.tsx`

- [ ] **Step 1: Rewrite terminal page with config form**

Replace `app/(dashboard)/terminal/page.tsx` with form that has 4 inputs (Agent IP, Terminal IP, Username, Password), save button (→ localStorage), test connection button (→ `Terminal.getCapabilities()`), and the existing "Abrir puerta" button.

```tsx
// app/(dashboard)/terminal/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DoorOpen, Settings, Wifi } from 'lucide-react'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'

export default function TerminalPage() {
  const [agentIp, setAgentIp] = useState('')
  const [terminalIp, setTerminalIp] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setAgentIp(localStorage.getItem('agentIp') || 'http://localhost:8000')
    setTerminalIp(localStorage.getItem('terminalIp') || '')
    setUsername(localStorage.getItem('terminalUsername') || 'admin')
    setPassword(localStorage.getItem('terminalPassword') || 'admin')
  }, [])

  const handleSave = () => {
    localStorage.setItem('agentIp', agentIp)
    localStorage.setItem('terminalIp', terminalIp)
    localStorage.setItem('terminalUsername', username)
    localStorage.setItem('terminalPassword', password)
    toast.success('Configuración guardada')
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await Terminal.getCapabilities()
      toast.success('Conexión exitosa con el agente')
    } catch {
      toast.error('No se pudo conectar con el agente')
    }
    setTesting(false)
  }

  const handleOpenDoor = async () => {
    try {
      await Terminal.openDoor()
      toast.success('Comando de apertura enviado')
    } catch {
      toast.error('Error al abrir puerta')
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-lg font-semibold">Configuración de Terminal</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings size={16} /> Conexión al Agente Hikvision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Agent IP (URL del agente local)</Label>
            <Input className="h-8 text-xs" value={agentIp} onChange={e => setAgentIp(e.target.value)} placeholder="http://localhost:8000" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Terminal IP</Label>
            <Input className="h-8 text-xs" value={terminalIp} onChange={e => setTerminalIp(e.target.value)} placeholder="192.168.1.100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Usuario</Label>
              <Input className="h-8 text-xs" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contraseña</Label>
              <Input className="h-8 text-xs" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Guardar configuración</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleTest} disabled={testing}>
              <Wifi size={12} /> {testing ? 'Probando...' : 'Probar conexión'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DoorOpen size={16} /> Control de Acceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpenDoor}>
            <DoorOpen size={12} /> Abrir puerta ahora
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/terminal/page.tsx"
git commit -m "feat: terminal config page — save/load from localStorage, test connection"
```

---

### Task 30: Remove Emerald Hardcodes from All Pages (Gemini)

**Files:**
- Modify: `app/(dashboard)/reports/page.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `components/layout/shift-blocker.tsx`
- Modify: `app/(dashboard)/page.tsx` (dashboard)
- Modify: `app/(dashboard)/shifts/page.tsx`
- Modify: `app/(dashboard)/shifts/[id]/page.tsx`

- [ ] **Step 1: Replace all `emerald-*` and `text-emerald-*` with semantic vars**

Search and replace across all files:
- `bg-emerald-900` → `bg-card`
- `bg-emerald-800` → `bg-secondary`
- `bg-emerald-700` → `bg-secondary`
- `bg-emerald-600` → `bg-primary`
- `text-emerald-600` → `text-primary`
- `text-emerald-300` → `text-primary`
- `text-emerald-100` → `text-foreground`
- `border-emerald-800` → `border-border`
- `border-emerald-600` → `border-primary`
- `bg-emerald-100` → `bg-secondary`
- `bg-emerald-950` → `bg-card`
- `text-yellow-600` → `text-[#FF9F0A]`
- `hover:bg-emerald-800` → `hover:bg-secondary`
- `hover:text-emerald-600` → `hover:text-primary`

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: replace all emerald hardcodes with semantic CSS variables"
```

---

## Wave 3 — Create Client Wizard (depends on Terminal class + Plans CRUD)

### Task 31: Install Dependencies (Claude)

- [ ] **Step 1: Install react-webcam, qrcode.react, date-fns**

```bash
npm install react-webcam qrcode.react date-fns
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-webcam, qrcode.react, date-fns"
```

---

### Task 32: Wizard Stepper Component (Claude)

**Files:**
- Create: `components/clients/wizard-stepper.tsx`

- [ ] **Step 1: Create stepper header component**

```tsx
// components/clients/wizard-stepper.tsx
'use client'

import { cn } from '@/lib/utils'

interface WizardStepperProps {
  steps: string[]
  currentStep: number
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-2 py-4">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
            i < currentStep && 'bg-primary border-primary text-primary-foreground',
            i === currentStep && 'border-primary text-primary',
            i > currentStep && 'border-border text-muted-foreground',
          )}>
            {i + 1}
          </div>
          <span className={cn(
            'text-xs hidden sm:inline',
            i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-8 h-px',
              i < currentStep ? 'bg-primary' : 'bg-border'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/clients/wizard-stepper.tsx
git commit -m "feat: add wizard stepper component"
```

---

### Task 33: Step 1 — Personal Data (Claude)

**Files:**
- Create: `components/clients/step-personal.tsx`

- [ ] **Step 1: Create personal data form step**

```tsx
// components/clients/step-personal.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface PersonalData {
  name: string; last_name: string; email: string;
  phone_number: string; date_of_birth: string; gender: string
}

interface Props {
  data: PersonalData
  onChange: (data: PersonalData) => void
}

export function StepPersonal({ data, onChange }: Props) {
  const set = (field: keyof PersonalData, value: string) =>
    onChange({ ...data, [field]: value })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input className="h-8 text-xs" value={data.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Apellido</Label>
          <Input className="h-8 text-xs" value={data.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input className="h-8 text-xs" type="email" value={data.email} onChange={e => set('email', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Teléfono</Label>
        <Input className="h-8 text-xs" value={data.phone_number} onChange={e => set('phone_number', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de nacimiento</Label>
          <Input className="h-8 text-xs" type="date" value={data.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Género</Label>
          <Select value={data.gender} onValueChange={v => set('gender', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
              <SelectItem value="O">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/clients/step-personal.tsx
git commit -m "feat: add Step 1 personal data component"
```

---

### Task 34: Step 2 — Biometrics (Claude)

**Files:**
- Create: `components/clients/step-biometrics.tsx`

- [ ] **Step 1: Create biometrics step with webcam + fingerprint**

```tsx
// components/clients/step-biometrics.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Camera, Fingerprint, RotateCcw } from 'lucide-react'
import Terminal from '@/lib/terminal'

export interface BiometricData {
  faceImage: string | null
  fingerprintData: any | null
}

interface Props {
  data: BiometricData
  onChange: (data: BiometricData) => void
}

export function StepBiometrics({ data, onChange }: Props) {
  const [capturingFP, setCapturingFP] = useState(false)
  const webcamRef = useRef<Webcam>(null)

  const capturePhoto = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) onChange({ ...data, faceImage: screenshot })
  }, [data, onChange])

  const captureFingerprint = async () => {
    setCapturingFP(true)
    try {
      const fp = await Terminal.readFingerPrint()
      onChange({ ...data, fingerprintData: fp })
    } catch (e) {
      console.error('Fingerprint capture error:', e)
    }
    setCapturingFP(false)
  }

  const fpQuality = data.fingerprintData?.fingerPrintQuality ?? null
  const fpLabel = fpQuality !== null
    ? fpQuality < 50 ? 'Mala calidad' : fpQuality < 80 ? 'Calidad media' : 'Buena calidad'
    : null

  return (
    <div className="space-y-4">
      {/* Face photo */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Foto facial</p>
        {!data.faceImage ? (
          <div className="space-y-2">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-md border border-border"
              videoConstraints={{ facingMode: 'user', width: 400, height: 300 }}
            />
            <Button size="sm" className="h-7 text-xs gap-1" onClick={capturePhoto}>
              <Camera size={12} /> Capturar imagen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <img src={data.faceImage} alt="Captura" className="w-full max-h-48 object-cover rounded-md border border-border" />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange({ ...data, faceImage: null })}>
              <RotateCcw size={12} /> Repetir imagen
            </Button>
          </div>
        )}
      </div>

      {/* Fingerprint */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Huella digital</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={captureFingerprint} disabled={capturingFP}>
          <Fingerprint size={12} /> {capturingFP ? 'Capturando... coloque el dedo' : 'Capturar huella digital'}
        </Button>
        {fpQuality !== null && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${fpQuality >= 80 ? 'bg-primary' : fpQuality >= 50 ? 'bg-[#FF9F0A]' : 'bg-destructive'}`} />
            <span className="text-xs text-muted-foreground">{fpLabel} ({fpQuality})</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/clients/step-biometrics.tsx
git commit -m "feat: add Step 2 biometrics — webcam + fingerprint capture"
```

---

### Task 35: Step 3 — Plan & Payment (Claude)

**Files:**
- Create: `components/clients/step-plan-payment.tsx`
- Create: `app/api/receipt-upload/route.ts`

- [ ] **Step 1: Create receipt upload API route**

```typescript
// app/api/receipt-upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

// In-memory store for receipt images (keyed by token)
const receipts = new Map<string, string>()

export async function POST(request: NextRequest) {
  const { token, image } = await request.json()
  if (!token || !image) return NextResponse.json({ error: 'Missing token or image' }, { status: 400 })
  receipts.set(token, image)
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const image = receipts.get(token)
  if (!image) return NextResponse.json({ image: null })
  receipts.delete(token)
  return NextResponse.json({ image })
}
```

- [ ] **Step 2: Create plan + payment step**

```tsx
// components/clients/step-plan-payment.tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, QrCode, RotateCcw } from 'lucide-react'
import { add } from 'date-fns'
import Webcam from 'react-webcam'
import { QRCodeSVG } from 'qrcode.react'

export interface PaymentData {
  plan_id: number
  payment_method: string
  start_date: string
  end_date: string
  receipt_image: string | null
}

interface Props {
  data: PaymentData
  onChange: (data: PaymentData) => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
}

function computeEndDate(startDate: string, duration: string | null): string {
  if (!duration || !startDate) return startDate
  const start = new Date(startDate)
  const parts = duration.match(/(\d+)\s*(day|days|mon|mons|month|months|year|years)/)
  if (!parts) return startDate
  const amount = parseInt(parts[1], 10)
  const unit = parts[2]
  if (unit.startsWith('day')) return add(start, { days: amount }).toISOString().split('T')[0]
  if (unit.startsWith('mon')) return add(start, { months: amount }).toISOString().split('T')[0]
  if (unit.startsWith('year')) return add(start, { years: amount }).toISOString().split('T')[0]
  return startDate
}

export function StepPlanPayment({ data, onChange, plans }: Props) {
  const [showWebcam, setShowWebcam] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrToken] = useState(() => Math.random().toString(36).slice(2))
  const webcamRef = useRef<Webcam>(null)

  const selectedPlan = plans.find(p => p.id === data.plan_id)
  const price = selectedPlan?.price ?? 0

  const set = (partial: Partial<PaymentData>) => onChange({ ...data, ...partial })

  const handlePlanChange = (planId: number) => {
    const plan = plans.find(p => p.id === planId)
    const today = new Date().toISOString().split('T')[0]
    const endDate = computeEndDate(today, plan?.duration ?? null)
    set({ plan_id: planId, start_date: today, end_date: endDate })
  }

  const captureReceipt = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) { set({ receipt_image: screenshot }); setShowWebcam(false) }
  }, [data])

  // Poll for QR receipt upload
  useEffect(() => {
    if (!showQR) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/receipt-upload?token=${qrToken}`)
        const { image } = await res.json()
        if (image) { set({ receipt_image: image }); setShowQR(false) }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [showQR, qrToken])

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/receipt-upload?upload=true&token=${qrToken}`
    : ''

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Plan</Label>
        <Select value={data.plan_id ? String(data.plan_id) : ''} onValueChange={v => handlePlanChange(Number(v))}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
          <SelectContent>
            {plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — ${p.price ?? 0}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Método de pago</Label>
        <Select value={data.payment_method} onValueChange={v => set({ payment_method: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="card">Tarjeta</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.payment_method === 'transfer' && (
        <div className="space-y-2">
          <Label className="text-xs">Comprobante de pago</Label>
          {data.receipt_image ? (
            <div className="space-y-2">
              <img src={data.receipt_image} alt="Comprobante" className="w-full max-h-32 object-cover rounded-md border border-border" />
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => set({ receipt_image: null })}>
                <RotateCcw size={12} /> Repetir
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowWebcam(true)}>
                <Camera size={12} /> Tomar foto
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowQR(true)}>
                <QrCode size={12} /> Enviar desde celular
              </Button>
            </div>
          )}
          {showWebcam && (
            <div className="space-y-2">
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full rounded-md border border-border" />
              <Button size="sm" className="h-7 text-xs" onClick={captureReceipt}>Capturar</Button>
            </div>
          )}
          {showQR && (
            <div className="flex flex-col items-center gap-2 p-4 border border-border rounded-md">
              <QRCodeSVG value={qrUrl} size={160} bgColor="#0B221E" fgColor="#00FF9D" />
              <p className="text-[10px] text-muted-foreground text-center">Escanea con tu celular para enviar la foto del comprobante</p>
            </div>
          )}
        </div>
      )}

      {data.start_date && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-muted-foreground">Inicio:</span> {data.start_date}</div>
          <div><span className="text-muted-foreground">Fin:</span> {data.end_date}</div>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <span className="text-sm font-bold">Total: ${price}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/clients/step-plan-payment.tsx app/api/receipt-upload/route.ts
git commit -m "feat: add Step 3 plan/payment + QR receipt upload endpoint"
```

---

### Task 36: Create Client Wizard + Submission Flow (Claude)

**Files:**
- Create: `components/clients/create-client-wizard.tsx`
- Modify: `app/(dashboard)/clients/page.tsx`

- [ ] **Step 1: Create wizard container with submission flow**

```tsx
// components/clients/create-client-wizard.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { WizardStepper } from './wizard-stepper'
import { StepPersonal, PersonalData } from './step-personal'
import { StepBiometrics, BiometricData } from './step-biometrics'
import { StepPlanPayment, PaymentData } from './step-plan-payment'
import { createClientRecord, createSubscription } from '@/lib/supabase/actions/clients'
import { createPayment } from '@/lib/supabase/actions/payments'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { getActiveShift } from '@/lib/supabase/actions/shifts'
import Terminal from '@/lib/terminal'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  plans: { id: number; name: string; price: number | null; duration: string | null }[]
}

const STEPS = ['Datos', 'Biométricos', 'Plan']

const emptyPersonal: PersonalData = { name: '', last_name: '', email: '', phone_number: '', date_of_birth: '', gender: 'M' }
const emptyBiometric: BiometricData = { faceImage: null, fingerprintData: null }
const emptyPayment: PaymentData = { plan_id: 0, payment_method: '', start_date: '', end_date: '', receipt_image: null }

export function CreateClientWizard({ open, onClose, plans }: Props) {
  const { userData } = useAuthStore()
  const { selectedLocation } = usePreferencesStore()
  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal)
  const [biometric, setBiometric] = useState<BiometricData>(emptyBiometric)
  const [payment, setPayment] = useState<PaymentData>(emptyPayment)
  const [saving, setSaving] = useState(false)

  const canNext = () => {
    if (step === 0) return personal.name && personal.last_name && personal.email
    if (step === 1) return biometric.faceImage && biometric.fingerprintData
    if (step === 2) return payment.plan_id && payment.payment_method &&
      (payment.payment_method !== 'transfer' || payment.receipt_image)
    return false
  }

  const handleSubmit = async () => {
    if (!userData || !selectedLocation) return
    setSaving(true)
    try {
      // 1. Insert client
      const client = await createClientRecord({
        ...personal,
        company_id: userData.company.id,
        image_url: biometric.faceImage ?? undefined,
      })

      // 2. Insert subscription
      await createSubscription({
        client_id: client.id,
        plan_id: payment.plan_id,
        location_id: selectedLocation.location.id,
        start_date: payment.start_date,
        end_date: payment.end_date,
      })

      // 3. Insert payment
      const activeShift = await getActiveShift(selectedLocation.location.id)
      await createPayment({
        subscription_id: client.id, // will be fixed with actual subscription id
        amount: plans.find(p => p.id === payment.plan_id)?.price ?? 0,
        payment_method: payment.payment_method,
        location_id: selectedLocation.location.id,
        shift_id: activeShift?.id ?? null,
        registered_by: null,
      })

      // 4. Terminal sync (non-blocking)
      try {
        const employeeNo = String(client.id)
        await Terminal.createPerson({
          name: `${personal.name} ${personal.last_name}`,
          employeeNo,
          userType: 'normal',
          beginTime: payment.start_date + 'T00:00:00',
          endTime: payment.end_date + 'T23:59:59',
        })
        if (biometric.faceImage) await Terminal.setUpFaceImage(employeeNo, biometric.faceImage)
        if (biometric.fingerprintData) await Terminal.setUpFingerPrint(employeeNo, biometric.fingerprintData.fingerPrintData)
        toast.success('Cliente creado y sincronizado con terminal')
      } catch {
        toast.warning('Cliente creado en DB. Error al sincronizar con terminal — reintenta desde el listado.')
      }

      // Reset and close
      setStep(0); setPersonal(emptyPersonal); setBiometric(emptyBiometric); setPayment(emptyPayment)
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:w-[450px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Nuevo cliente</SheetTitle>
        </SheetHeader>
        <WizardStepper steps={STEPS} currentStep={step} />
        <div className="mt-2">
          {step === 0 && <StepPersonal data={personal} onChange={setPersonal} />}
          {step === 1 && <StepBiometrics data={biometric} onChange={setBiometric} />}
          {step === 2 && <StepPlanPayment data={payment} onChange={setPayment} plans={plans} />}
        </div>
        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          {step > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setStep(s => s - 1)}>
              Atrás
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Siguiente
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={handleSubmit} disabled={saving || !canNext()}>
              {saving ? 'Guardando...' : 'Crear cliente'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Update clients page to use new wizard**

In `app/(dashboard)/clients/page.tsx`, replace the import and usage:

```tsx
// Change this import:
import { CreateClientSheet } from '@/components/clients/create-client-sheet'
// To:
import { CreateClientWizard } from '@/components/clients/create-client-wizard'
```

And replace the component usage at the bottom:

```tsx
// Change:
<CreateClientSheet open={showCreate} onClose={() => { setShowCreate(false); load() }} plans={plans} />
// To:
<CreateClientWizard open={showCreate} onClose={() => { setShowCreate(false); load() }} plans={plans} />
```

Also update the `plans` data in the `load` function to include `price` and `duration`:

```tsx
setPlans(pData.map(p => ({
  id: p.id,
  name: p.name ?? 'Sin nombre',
  price: p.price ?? null,
  duration: p.duration ?? null,
})))
```

- [ ] **Step 3: Commit**

```bash
git add components/clients/create-client-wizard.tsx "app/(dashboard)/clients/page.tsx"
git commit -m "feat: create client wizard — 3 steps with biometrics + terminal sync"
```

---

## Wave 4 — Polish

### Task 37: Monthly Reports Upgrade (Codex)

**Files:**
- Modify: `app/(dashboard)/reports/monthly-payments/page.tsx`

- [ ] **Step 1: Add summary cards for cash/card/other + CSV export**

Add 4 MetricCards (Total, Efectivo, Tarjeta, Otros) and an "Exportar CSV" button. The CSV export creates a Blob and triggers download via `URL.createObjectURL`.

Compute totals:
```typescript
const cash = payments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + (p.amount ?? 0), 0)
const card = payments.filter(p => p.payment_method === 'card').reduce((s, p) => s + (p.amount ?? 0), 0)
const other = total - cash - card
```

CSV export function:
```typescript
const exportCSV = () => {
  const header = 'Cliente,Plan,Monto,Método,Fecha\n'
  const rows = payments.map(p => {
    const c = (p.subscriptions as any)?.clients
    const name = c ? `${c.name} ${c.last_name}` : ''
    const plan = (p.subscriptions as any)?.plans?.name ?? ''
    return `"${name}","${plan}",${p.amount ?? 0},"${p.payment_method}","${p.payment_date?.split('T')[0] ?? ''}"` 
  }).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `pagos-${year}-${month}.csv`; a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/reports/monthly-payments/page.tsx"
git commit -m "feat: monthly report — summary cards by method + CSV export"
```

---

### Task 38: Login Page Neon Dark (Gemini)

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Update login page styles**

Replace `bg-muted/40` with `bg-background`. The Card already inherits from CSS vars. Update the emoji to use primary color. Remove any emerald references.

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: update login page to neon dark palette"
```

---

## Agent Assignment Summary

| Task | Assignee | Wave |
|------|----------|------|
| T18 Neon Dark Theme | **Gemini** | 1 |
| T19 Terminal Class Rewrite | **Codex** | 1 |
| T20 Plans Migration + Action | **Codex** | 1 |
| T21 DataTable Pagination | **Claude** | 1 |
| T22 Sidebar Preferences Store | **Claude** | 1 |
| T23 Sidebar Redesign | **Gemini** | 2 |
| T24 Topbar Redesign | **Gemini** | 2 |
| T25 Dashboard Layout Update | **Gemini** | 2 |
| T26 Plans CRUD Page | **Codex** | 2 |
| T27 Locations CRUD Page | **Codex** | 2 |
| T28 Workers CRUD Page | **Codex** | 2 |
| T29 Terminal Config Page | **Codex** | 2 |
| T30 Remove Emerald Hardcodes | **Gemini** | 2 |
| T31 Install Dependencies | **Claude** | 3 |
| T32 Wizard Stepper | **Claude** | 3 |
| T33 Step 1 Personal | **Claude** | 3 |
| T34 Step 2 Biometrics | **Claude** | 3 |
| T35 Step 3 Plan/Payment | **Claude** | 3 |
| T36 Wizard + Submission | **Claude** | 3 |
| T37 Monthly Reports | **Codex** | 4 |
| T38 Login Page Neon | **Gemini** | 4 |

**Totals:** Gemini: 6 tasks (UX/UI), Codex: 7 tasks (CRUD/backend), Claude: 8 tasks (wizard/core)

---

## Verification

After all tasks are merged:

1. `npm run dev` — app starts without errors.
2. Navigate to `/` — dashboard loads with neon dark theme, metric cards, sidebar expanded.
3. Toggle sidebar — collapses to 48px icons, re-expands.
4. Mobile viewport (< 768px) — sidebar hidden, hamburger in topbar works.
5. `/plans` — create plan, toggle active/inactive.
6. `/locations` — create/edit location.
7. `/workers` — invite worker by email, change role, deactivate.
8. `/terminal` — save config, test connection, open door.
9. `/clients` — "Nuevo cliente" → 3-step wizard → capture photo → capture fingerprint → select plan → create.
10. `/reports/monthly-payments` — filter by month, see summary cards, export CSV.
11. All tables show pagination bar with "Mostrando X–Y de Z" and page size selector.

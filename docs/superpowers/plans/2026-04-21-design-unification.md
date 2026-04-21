# Design Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the visual design system of vitalify-trainner-web in vitalify-admin — same colors, typography, glass effects, hover animations — without changing any functionality.

**Architecture:** Token-first approach. Task 1 updates `globals.css` so CSS variables propagate the design change automatically across all pages. Tasks 2–6 update the handful of components that need targeted structural changes beyond token swaps. Tasks 7–8 do global class-name renames that can't be handled by tokens alone.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui (base-nova), next/font/google, tw-animate-css

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | Full rewrite — tokens, fonts, utilities |
| `app/layout.tsx` | Font: Inter+SpaceGrotesk → Manrope |
| `app/(dashboard)/layout.tsx` | Remove hardcoded bg/text colors |
| `components/layout/sidebar.tsx` | Active/inactive states, bg token, height |
| `components/layout/topbar.tsx` | Height h-12→h-16, backdrop-blur |
| `components/shared/metric-card.tsx` | glass-panel, remove corner brackets, add bottom line |
| All files listed in Task 7 | `.neon-card` → `.glass-panel` |
| All files listed in Task 8 | `.text-hud` → `.text-technical` |

---

## Task 1: Replace Design Tokens in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import "tailwindcss";

@import "../node_modules/tw-animate-css/dist/tw-animate.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: var(--font-manrope);
  --font-heading: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-primary-container: #13eca4;
  --color-surface-container: rgba(25, 51, 43, 0.6);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --shadow-neon: 0 0 15px rgba(19, 236, 164, 0.15);
}

::selection {
  background: #13eca4;
  color: #10221c;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #10221c;
}

::-webkit-scrollbar-thumb {
  background: #19332b;
  border-radius: 10px;
  border: 2px solid #10221c;
}

::-webkit-scrollbar-thumb:hover {
  background: #234238;
}

:root {
  --background: #10221c;
  --foreground: #ffffff;
  --card: rgba(25, 51, 43, 0.6);
  --card-foreground: #ffffff;
  --popover: #19332b;
  --popover-foreground: #ffffff;
  --primary: #13eca4;
  --primary-foreground: #10221c;
  --secondary: #0c5439;
  --secondary-foreground: #ffffff;
  --muted: #19332b;
  --muted-foreground: #92c9b7;
  --accent: rgba(19, 236, 164, 0.15);
  --accent-foreground: #13eca4;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(25, 51, 43, 0.8);
  --ring: #13eca4;
  --radius: 1rem;
  --sidebar: #10221c;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #13eca4;
  --sidebar-primary-foreground: #10221c;
  --sidebar-accent: rgba(25, 51, 43, 0.8);
  --sidebar-accent-foreground: #13eca4;
  --sidebar-border: rgba(255, 255, 255, 0.05);
  --sidebar-ring: #13eca4;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: "Manrope", system-ui, sans-serif;
  }
}

@layer utilities {
  .glass-panel {
    background: rgba(25, 51, 43, 0.6);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .glow-primary {
    box-shadow: 0 4px 20px rgba(19, 236, 164, 0.15);
  }

  .text-technical {
    @apply uppercase tracking-widest font-bold;
    font-size: 0.75rem;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(19, 236, 164, 0.2);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(19, 236, 164, 0.4);
  }
}
```

- [ ] **Step 2: Verify dev server loads without CSS errors**

Run: `npm run dev`
Expected: Server starts, no CSS parse errors in terminal. Background should now be `#10221c` (dark green), primary should be `#13eca4` (slightly softer neon).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: replace design tokens with trainer-web palette"
```

---

## Task 2: Update Font (layout.tsx) and Remove Hardcoded Colors (dashboard layout)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace font imports in app/layout.tsx**

Replace the entire file content:

```tsx
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'Vitalify Admin',
  description: 'Panel de administración Vitalify',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Remove hardcoded colors from dashboard layout**

In `app/(dashboard)/layout.tsx` line 35, change:
```tsx
<div className="min-h-screen bg-[#03110f] text-[#ecfdf9]">
```
to:
```tsx
<div className="min-h-screen bg-background text-foreground">
```

- [ ] **Step 3: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/(dashboard)/layout.tsx
git commit -m "style: replace Inter+SpaceGrotesk with Manrope, use semantic bg token in dashboard layout"
```

---

## Task 3: Update Sidebar

**Files:**
- Modify: `components/layout/sidebar.tsx`

**Changes:**
- Background: hardcoded `bg-[#061614]` → `bg-sidebar` (token now `#10221c`)
- Active item: remove left-border indicator + glow → `glass-panel text-primary`
- Inactive item: update hover colors
- Item height: add `h-11` for uniform height

- [ ] **Step 1: Replace sidebar.tsx**

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Home, Users, CreditCard, ClipboardList, Timer,
  MapPin, BarChart3, UserCog, Fingerprint, X,
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
  const showAdmin = role === 'admin'

  const renderItem = (item: (typeof generalItems)[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false) }}
            className={cn(
              'relative flex items-center gap-3 px-4 h-11 text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-200 rounded-lg',
              isActive
                ? 'glass-panel text-primary'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={16} className={cn(
              'flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
              isActive ? 'text-primary' : 'text-white/40'
            )} />
            {sidebarOpen && (
              <span>{item.label}</span>
            )}
          </Link>
        </TooltipTrigger>
        {!sidebarOpen && (
          <TooltipContent side="right" className="text-[9px] uppercase tracking-widest font-bold">
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delay={0}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-white/5 shadow-2xl flex flex-col z-40 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-[200px]' : 'w-14',
          !sidebarOpen && 'max-md:-translate-x-full'
        )}
      >
        {/* Header / Logo Section */}
        <div className={cn(
          'flex items-center h-16 px-4 mb-4 border-b border-white/5',
          sidebarOpen ? 'justify-between' : 'justify-center'
        )}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 animate-in fade-in duration-500">
              <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center shadow-neon">
                <span className="text-[10px] font-black text-primary-foreground italic">V</span>
              </div>
              <span className="font-black text-xs uppercase tracking-[0.3em] text-foreground">
                Vitalify
              </span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all group"
          >
            {sidebarOpen ? (
              <X size={14} className="text-primary group-hover:rotate-90 transition-transform" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary italic">V</span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 overflow-y-auto custom-scrollbar">
          {sidebarOpen && (
            <p className="px-2 mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Principales
            </p>
          )}
          {generalItems.map(renderItem)}

          {showAdmin && (
            <div className="mt-6">
              {sidebarOpen && (
                <p className="px-2 mb-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                  Administración
                </p>
              )}
              {adminItems.map(renderItem)}
            </div>
          )}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary glow-primary animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-primary/60">Servidor Activo</span>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "style: update sidebar to trainer-web glass-panel active state"
```

---

## Task 4: Update Topbar

**Files:**
- Modify: `components/layout/topbar.tsx`

**Changes:**
- Height: `h-12` → `h-16`
- Background: `bg-card border-b border-border` → `bg-background/50 backdrop-blur-xl border-b border-white/5`

- [ ] **Step 1: Update the header element in topbar.tsx**

Change line 55 from:
```tsx
className="fixed top-0 right-0 h-12 bg-card border-b border-border flex items-center px-4 gap-3 z-30 transition-all duration-200"
```
to:
```tsx
className="fixed top-0 right-0 h-16 bg-background/50 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-3 z-30 transition-all duration-200"
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "style: update topbar to h-16 with backdrop-blur"
```

---

## Task 5: Update MetricCard

**Files:**
- Modify: `components/shared/metric-card.tsx`

**Changes:**
- Replace `neon-card hover:border-primary/30` with `glass-panel border-0 hover:scale-[1.02]`
- Remove corner bracket decoration
- Add bottom accent line
- Replace `text-hud` with `text-technical`
- Remove `font-heading` from value (now single font)

- [ ] **Step 1: Replace metric-card.tsx**

```tsx
// components/shared/metric-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
}

export function MetricCard({ title, value, subtitle, className, trend }: MetricCardProps) {
  return (
    <Card className={cn('glass-panel border-0 overflow-hidden group transition-all duration-300 hover:scale-[1.02]', className)}>
      <CardContent className="p-4 relative">
        <div className="space-y-1">
          <p className="text-technical text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
              {value}
            </p>
            {trend && (
              <span className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-sm',
                trend.isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
              )}>
                {trend.isPositive ? '+' : '-'}{trend.value}%
              </span>
            )}
          </div>
          {(subtitle || trend?.label) && (
            <p className="text-[10px] text-muted-foreground/70">
              {subtitle || trend?.label}
            </p>
          )}
        </div>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/shared/metric-card.tsx
git commit -m "style: update MetricCard to glass-panel with bottom accent line"
```

---

## Task 6: Replace .neon-card with .glass-panel (Global)

These files use `.neon-card` as a standalone class and need it replaced with `.glass-panel`. Where `.neon-card` had `border-l-4 border-l-primary` combined, keep the border-l intact.

**Files:**
- Modify: `app/(auth)/login/page.tsx` (line 63)
- Modify: `app/(dashboard)/payments/page.tsx` (line 138)
- Modify: `app/(dashboard)/plans/page.tsx` (line 173)
- Modify: `app/(dashboard)/terminal/page.tsx` (lines 73, 146)
- Modify: `app/(dashboard)/workers/page.tsx` (line 277)
- Modify: `app/(dashboard)/page.tsx` (lines 85, 125)
- Modify: `components/clients/edit-client-dialog.tsx` (line 218)

- [ ] **Step 1: Global find-replace neon-card → glass-panel**

Run:
```bash
find /Users/krissk1ng/Documents/velarizon/vitalify/vitalify-admin -type f -name "*.tsx" \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  -exec sed -i '' 's/neon-card/glass-panel/g' {} +
```

- [ ] **Step 2: Verify no neon-card references remain**

Run:
```bash
grep -r "neon-card" . --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next
```

Expected: No output (zero matches).

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "style: replace neon-card with glass-panel across all pages"
```

---

## Task 7: Replace .text-hud with .text-technical (Global)

**Files:**
- Modify: `app/(auth)/login/page.tsx` (lines 57, 66, 80)
- Modify: `app/(dashboard)/clients/page.tsx` (line 192)
- Modify: `app/(dashboard)/payments/page.tsx` (line 126)
- Modify: `app/(dashboard)/plans/page.tsx` (lines 162, 186, 252, 264, 283, 301, 326, 340)
- Modify: `app/(dashboard)/terminal/page.tsx` (lines 64, 83, 97, 111, 122)
- Modify: `app/(dashboard)/workers/page.tsx` (lines 313, 326, 344, 385, 403)
- Modify: `app/(dashboard)/page.tsx` (line 48)
- Modify: `components/clients/edit-client-dialog.tsx` (many lines)

- [ ] **Step 1: Global find-replace text-hud → text-technical**

Run:
```bash
find /Users/krissk1ng/Documents/velarizon/vitalify/vitalify-admin -type f -name "*.tsx" \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  -exec sed -i '' 's/text-hud/text-technical/g' {} +
```

- [ ] **Step 2: Verify no text-hud references remain**

Run:
```bash
grep -r "text-hud" . --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next
```

Expected: No output (zero matches).

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add -p
git commit -m "style: replace text-hud with text-technical across all pages"
```

---

## Task 8: Final Visual Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Check each route visually**

Open browser at `http://localhost:3000` and verify:

| Route | What to check |
|---|---|
| `/login` | Glass panel card, Manrope font, teal primary color |
| `/` (dashboard) | MetricCards with bottom accent line on hover, correct background |
| `/clients` | DataTable, header text in uppercase with Manrope |
| `/payments` | neon-card → glass-panel effect visible |
| `/plans` | Plan cards glass panel, labels `.text-technical` style |
| `/workers` | Same |
| `/terminal` | Glass panel cards |
| Sidebar | Active item has glass panel background (no left border), inactive items white/60 |
| Topbar | Taller (h-16), frosted glass background |

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "style: complete design unification with vitalify-trainner-web"
```

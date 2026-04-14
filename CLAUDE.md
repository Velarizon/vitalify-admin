# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vitalify Admin

Panel de administración para gimnasios. Comparte la misma base de datos Supabase que `kraken-web` (proyecto hermano en `../kraken-web`). No modificar kraken-web desde aquí.

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (watch)
npm run test:run     # Vitest (single run)
npx tsc --noEmit    # Type check without building
```

## Environment

`.env.local` en la raíz (no commiteado):
```
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env como VITE_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<requerido solo para invitar workers via auth.admin>
```

## Architecture

**Stack:** Next.js 15 App Router · shadcn/ui (style: `base-nova`) · Tailwind CSS v4 · Supabase SSR · Zustand v5 · Vitest

**Route groups:**
- `app/(auth)/login` — página pública de login
- `app/(dashboard)/*` — todas las páginas protegidas (layout compartido con sidebar + topbar)
- `app/api/receipt-upload` — endpoint para subir comprobantes via QR desde celular

**Auth flow:** `middleware.ts` verifica sesión en cada request. Rutas admin-only (`/plans`, `/locations`, `/reports`, `/workers`, `/terminal`) redirigen a workers a `/`. IMPORTANTE: el middleware tiene un early-return para requests con header `next-action` (Server Actions) — sin esto los actions POST reciben redirects en vez de JSON.

**Supabase clients:**
- `lib/supabase/server.ts` — `createClient()` async, para Server Components y Server Actions
- `lib/supabase/client.ts` — para Client Components (evitar cuando sea posible)
- Todos los Server Actions viven en `lib/supabase/actions/*.ts` con `'use server'`

**Estado cliente:**
- `stores/auth.ts` — sesión, userData, company, locations, role. Se hidrata al login via `getUserData()` server action.
- `stores/preferences.ts` — `selectedLocation`, `sidebarOpen`. Persistido en localStorage con `{ name: 'user-preferences' }`.
- Zustand v5: usar `create<T>()(persist(...))` — NO `create(persist<T>(...))`.

**Design system:** Neon Dark. Variables CSS en `app/globals.css` — `:root` con hex values + `@theme inline` mapeando `--color-*` para que Tailwind v4 genere las utility classes. Usar siempre variables semánticas (`bg-primary`, `text-muted-foreground`, etc.), nunca hardcodes `emerald-*`.

**Componentes compartidos:**
- `components/shared/data-table.tsx` — DataTable con búsqueda global, paginación (25/50/100), `overflow-x-auto`
- `components/shared/metric-card.tsx` — Card KPI con título + valor
- `components/shared/table-skeleton.tsx` — Skeleton loader para tablas

**Terminal Hikvision:** `lib/terminal.ts` exporta clase singleton `Terminal`. Lee config de localStorage (`agentIp`, `terminalIp`, etc.). Llama directamente al agente local (no via API route). Configurable desde `/terminal`.

## Multi-agent coordination

`AGENTS.md` es el tablero de coordinación. La existencia de una rama `task/T{ID}-*` indica ownership. Protocolo:

```bash
git worktree add ../vitalify-admin-T{ID} -b task/T{ID}-{slug}
# trabajar en ../vitalify-admin-T{ID}
git merge task/T{ID}-{slug} --no-ff -m "Merge task/T{ID}-{slug}"
git worktree remove ../vitalify-admin-T{ID}
git branch -d task/T{ID}-{slug}
```

## Key gotchas

- **`shadcn add` falla** por la config de color `emerald` en `components.json`. Instalar componentes manualmente copiando de la fuente + `npm install @radix-ui/<component>`.
- **`is_active` en planes** — la columna existe en la DB pero no en los tipos generados de Supabase. Usar `as any` hasta regenerar tipos.
- **Tailwind v4 + CSS vars** — Las variables deben estar tanto en `:root` (valores) como en `@theme inline` (mapeo `--color-*`). Sin el `@theme`, utilidades como `border-border` no funcionan.
- **Ark UI vs Radix** — El proyecto usa `@base-ui/react` (Ark UI) para algunos primitivos, no Radix. `TooltipTrigger` no soporta `asChild`. `Select.onValueChange` puede retornar `string | null`.

# Vitalify Admin — Agent Coordination Board

Este archivo es el punto de entrada para todos los agentes (Claude, Gemini, GPT Codex, Copilot) que trabajen en este proyecto. La coordinación funciona via **ramas git** — no via edición de este archivo. La existencia de una rama es la señal de ownership; el merge a `main` es la señal de completado.

---

## Documentos de referencia

| Documento | Ruta |
|---|---|
| Plan de implementación (tareas con código completo) | `docs/superpowers/plans/2026-04-13-vitalify-admin.md` |
| Spec de diseño (arquitectura, DB schema, decisiones) | `docs/superpowers/specs/2026-04-13-vitalify-admin-design.md` |

---

## Protocolo para agentes con worktrees

### 1. Ver qué tareas están disponibles

```bash
# Tareas en progreso = ramas que existen
git branch -a | grep task/

# Tareas completadas = ramas ya mergeadas a main
git log --oneline --merges main | grep task/

# Estado rápido completo
echo "=== EN PROGRESO ===" && git branch | grep task/
echo "=== COMPLETADAS ===" && git log --oneline --merges main | grep task/ | head -20
echo "=== WORKTREES ACTIVOS ===" && git worktree list
```

Si no existe una rama `task/T{ID}-*` → la tarea está libre.

### 2. Tomar una tarea

Verificar dependencias primero (ver tabla abajo). Luego:

```bash
# Desde la raíz del repo principal
git fetch origin

# Crear worktree aislado para tu tarea
git worktree add ../vitalify-admin-T06 -b task/T06-middleware
cd ../vitalify-admin-T06
npm install
```

El directorio `../vitalify-admin-T06` es tu espacio de trabajo aislado.

### 3. Trabajar en la tarea

Lee la tarea completa en el plan antes de escribir código:
```bash
grep -n "### Task 6" docs/superpowers/plans/2026-04-13-vitalify-admin.md
```

Sigue los pasos del plan exactamente — cada paso tiene código listo para usar.

### 4. Completar la tarea

```bash
# Dentro de tu worktree (ej: ../vitalify-admin-T06)
git add .
git commit -m "feat: add auth middleware with role-based routing"

# Mergear a main
cd ../vitalify-admin
git merge task/T06-middleware --no-ff -m "Merge task/T06-middleware"

# Limpiar el worktree
git worktree remove ../vitalify-admin-T06
git branch -d task/T06-middleware
```

### Reglas

- **Dependencias primero.** No tomes T09 si T03 o T05 no están mergeadas en `main`.
- **Una rama = una tarea = un agente.** Si la rama existe, no la tomes.
- **Siempre desde main actualizado.** Antes de crear tu worktree, `git pull origin main`.
- **No editar archivos de otras tareas.** Tu worktree tiene todo el repo pero solo modifica los archivos de tu tarea (listados en el plan).
- **Los agentes NO tienen permisos Bash en subagent mode.** Si eres un subagente, necesitas que el agente coordinador corra los comandos git y npm. Escribe los archivos con Write/Edit y pide al coordinador que haga los commits.

---

## Task Board

> **Cómo leer el estado:**
> - `pending` → rama no existe, libre para tomar
> - `in_progress` → rama `task/T{ID}-*` existe
> - `completed` → mergeada a `main`

### Phase 1: Foundation ✅ COMPLETADA

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T01 | `task/T01-scaffold` | Scaffold Next.js 15 + Vitest | — | `completed` |
| T02 | `task/T02-shadcn-tailwind` | shadcn/ui + Tailwind emerald + dark mode | T01 | `completed` |
| T03 | `task/T03-supabase-clients` | Supabase clients + tipos | T01 | `completed` |
| T04 | `task/T04-zustand-stores` | Zustand stores (auth + preferences) | T01 | `completed` |
| T05 | `task/T05-db-migration` | DB migration (shifts) + computeShiftTotals | T01 | `completed` |
| T06 | `task/T06-middleware` | Middleware auth + role routing | T03, T04 | `pending` |

### Phase 2: Auth & Shell — 🔓 LISTA PARA OLEADA 2

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T06 | `task/T06-middleware` | Middleware auth + role routing | T03 ✅, T04 ✅ | `pending` |
| T07 | `task/T07-login` | Login page + auth actions | T03 ✅, T04 ✅ | `pending` |
| T08 | `task/T08-layout` | Sidebar + Topbar + Dashboard layout | T02 ✅, T04 ✅ | `pending` |
| T09 | `task/T09-shift-blocker` | ShiftBlocker modal + shifts actions base | T03 ✅, T05 ✅ | `pending` |
| T10 | `task/T10-shared-components` | Shared DataTable + MetricCard | T02 ✅ | `completed` |

> ⚠️ **T09 requiere migración SQL manual.** Antes de que T09 funcione end-to-end, ejecutar en Supabase SQL Editor (`https://supabase.com/dashboard/project/ekpujtewohbquqjwtowr/sql/new`):
> ```sql
> CREATE TABLE shifts (
>   id              serial PRIMARY KEY,
>   location_id     integer NOT NULL REFERENCES locations(id),
>   opened_by       uuid NOT NULL,
>   opened_at       timestamptz NOT NULL DEFAULT now(),
>   closed_at       timestamptz,
>   cash_amount     numeric NOT NULL DEFAULT 0,
>   card_amount     numeric NOT NULL DEFAULT 0,
>   other_amount    numeric NOT NULL DEFAULT 0,
>   total_amount    numeric NOT NULL DEFAULT 0,
>   notes           text
> );
> CREATE INDEX idx_shifts_opened_by_location ON shifts(opened_by, location_id);
> CREATE INDEX idx_shifts_location_closed ON shifts(location_id, closed_at);
> ALTER TABLE payments
>   ADD COLUMN IF NOT EXISTS shift_id integer REFERENCES shifts(id),
>   ADD COLUMN IF NOT EXISTS registered_by uuid;
> CREATE INDEX idx_payments_shift ON payments(shift_id);
> ```

### Phase 3: Migrated screens

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T11 | `task/T11-dashboard-page` | Dashboard page | T09, T10 | `pending` |
| T12 | `task/T12-clients-page` | Clients page + CreateClientSheet | T09, T10 | `pending` |
| T13 | `task/T13-payments-page` | Payments page + actions | T09, T10 | `pending` |
| T14 | `task/T14-plans-locations-reports` | Plans, Locations, Reports pages | T09, T10 | `pending` |

### Phase 4: New features

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T15 | `task/T15-shifts-pages` | Shifts pages (lista + detalle + cierre) | T09, T10 | `pending` |
| T16 | `task/T16-workers-page` | Workers page + actions | T09, T10 | `pending` |
| T17 | `task/T17-terminal` | Terminal adapter + API route + page | T02 ✅, T03 ✅ | `pending` |

---

## Mapa de dependencias y parallelismo

```
T01 ──┬──► T02 ──┬──► T08
      │          ├──► T10 ──┬──► T11
      ├──► T03 ──┤          ├──► T12
      │          ├──► T06   ├──► T13
      │          ├──► T07   ├──► T14
      │          ├──► T09 ──┤──► T15
      │          └──► T17   └──► T16
      ├──► T04 ──┬──► T06
      │          ├──► T07
      │          └──► T08
      └──► T05 ──► T09
```

**Oleada 1** ✅ COMPLETADA: T01 → T02, T03, T04, T05

**Oleada 2** 🔓 LISTA: T06, T07, T08, T09, T10 → **5 agentes en paralelo**

**Oleada 3** (después de oleada 2): T11, T12, T13, T14, T15, T16, T17 → **hasta 7 agentes en paralelo**

---

## Notas técnicas importantes para agentes

### Decisiones tomadas en Phase 1 que afectan tu tarea

1. **Zustand v5 idiom:** Usar `create<T>()(persist(...))` — NO `create(persist<T>(...))`.

2. **`UserRole` es un tipo exportado en `stores/auth.ts`:**
   ```typescript
   export type UserRole = 'admin' | 'worker'
   ```
   Importar de ahí, no redefinir el union type.

3. **`ShiftPayment.amount` es `number | null`** (no solo `number`) — siempre usar `?? 0` al operar.

4. **`tw-animate-css` requiere ruta relativa** en globals.css:
   ```css
   @import "../node_modules/tw-animate-css/dist/tw-animate.css";
   ```
   (Turbopack no resuelve la condición `"style"` del exports map.)

5. **shadcn style es `"base-nova"`** — no `"default"` ni `"new-york"`. Los componentes generados tienen ese estilo.

6. **`@supabase/ssr` cookie pattern:** El `try/catch` vacío en `setAll` de `server.ts` es intencional — no remover.

7. **`app/page.tsx` tiene boilerplate** de create-next-app — se reemplaza en T08.

### Variables de entorno

`.env.local` debe existir en la raíz con:
```
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env como VITE_SUPABASE_ANON_KEY>
```

---

## Verificar estado actual (comando rápido)

```bash
cd /Users/krissk1ng/Documents/kraken/vitalify-admin

echo "=== EN PROGRESO ===" && git branch | grep task/
echo "=== COMPLETADAS ===" && git log --oneline --merges main | grep task/ | head -20
echo "=== WORKTREES ACTIVOS ===" && git worktree list
```

---

## Stack del proyecto

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (16.2.3), App Router |
| UI | shadcn/ui (base-nova) + Tailwind CSS v4 (paleta emerald) |
| Auth / DB | Supabase + @supabase/ssr (cookie-based) |
| Estado cliente | Zustand v5 (persistido en localStorage) |
| Data fetching | Server Components (fetches) + Server Actions (mutaciones) |
| Test | Vitest v4 + @testing-library/react |
| Terminal | Clase Terminal (proxy a agente Hikvision local) |

## Variables de entorno requeridas

```bash
# .env.local (no commiteado)
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env>
```

## Fuente de datos

Mismo proyecto Supabase que `kraken-web`. La migración en T05 agrega la tabla `shifts` y columnas `shift_id` + `registered_by` en `payments` — cambios aditivos, no rompen nada existente. **La migración SQL aún no se ha ejecutado en Supabase** — ver nota en T09.

---

## Historial

| Fecha | Agente | Acción |
|---|---|---|
| 2026-04-13 | Claude Sonnet 4.6 | Creó spec, plan, AGENTS.md, CLAUDE.md, GEMINI.md |
| 2026-04-13 | Claude Sonnet 4.6 | Rediseñó coordinación a git-branch-based (sin editar AGENTS.md) |
| 2026-04-14 | Claude Sonnet 4.6 | Completó Phase 1: T01–T05 mergeadas a main |
| 2026-04-14 | Gemini CLI | Completó Task 10: Shared DataTable + MetricCard |

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
git log --oneline main | grep "Merge task/"
```

Si no existe una rama `task/T{ID}-*` → la tarea está libre.

### 2. Tomar una tarea

Verificar dependencias primero (ver tabla abajo). Luego:

```bash
# Desde la raíz del repo principal
git fetch origin

# Crear worktree aislado para tu tarea
git worktree add ../vitalify-admin-T03 -b task/T03-supabase-clients
cd ../vitalify-admin-T03
```

El directorio `../vitalify-admin-T03` es tu espacio de trabajo aislado. Otros agentes trabajan en sus propios directorios simultáneamente sin conflictos.

### 3. Trabajar en la tarea

Lee la tarea completa en el plan antes de escribir código:
```bash
cat docs/superpowers/plans/2026-04-13-vitalify-admin.md | grep -A 200 "### Task 3"
```

Sigue los pasos del plan exactamente — cada paso tiene código listo para usar.

### 4. Completar la tarea

```bash
# Dentro de tu worktree (ej: ../vitalify-admin-T03)
git add .
git commit -m "feat: add Supabase browser and server clients"

# Mergear a main
cd ../vitalify-admin
git merge task/T03-supabase-clients --no-ff -m "Merge task/T03-supabase-clients"

# Limpiar el worktree
git worktree remove ../vitalify-admin-T03
git branch -d task/T03-supabase-clients
```

### Reglas

- **Dependencias primero.** No tomes T06 si T03 o T04 no están mergeadas en `main`.
- **Una rama = una tarea = un agente.** Si la rama existe, no la tomes.
- **Siempre desde main actualizado.** Antes de crear tu worktree, `git pull origin main`.
- **No editar archivos de otras tareas.** Tu worktree tiene todo el repo pero solo modifica los archivos de tu tarea (listados en el plan).

---

## Task Board

> **Cómo leer el estado:**
> - `pending` → rama no existe, libre para tomar
> - `in_progress` → rama `task/T{ID}-*` existe
> - `completed` → mergeada a `main`

### Phase 1: Foundation

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T01 | `task/T01-scaffold` | Scaffold Next.js 15 + Vitest | — | `pending` |
| T02 | `task/T02-shadcn-tailwind` | shadcn/ui + Tailwind emerald + dark mode | T01 | `pending` |
| T03 | `task/T03-supabase-clients` | Supabase clients + tipos | T01 | `pending` |
| T04 | `task/T04-zustand-stores` | Zustand stores (auth + preferences) | T01 | `pending` |
| T05 | `task/T05-db-migration` | DB migration (shifts) + computeShiftTotals | T01 | `pending` |
| T06 | `task/T06-middleware` | Middleware auth + role routing | T03, T04 | `pending` |

### Phase 2: Auth & Shell

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T07 | `task/T07-login` | Login page + auth actions | T03, T04 | `pending` |
| T08 | `task/T08-layout` | Sidebar + Topbar + Dashboard layout | T02, T04 | `pending` |
| T09 | `task/T09-shift-blocker` | ShiftBlocker modal + shifts actions base | T03, T05 | `pending` |

### Phase 3: Migrated screens

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T10 | `task/T10-shared-components` | Shared DataTable + MetricCard | T02 | `pending` |
| T11 | `task/T11-dashboard-page` | Dashboard page | T09, T10 | `pending` |
| T12 | `task/T12-clients-page` | Clients page + CreateClientSheet | T09, T10 | `pending` |
| T13 | `task/T13-payments-page` | Payments page + actions | T09, T10 | `pending` |
| T14 | `task/T14-plans-locations-reports` | Plans, Locations, Reports pages | T09, T10 | `pending` |

### Phase 4: New features

| ID | Rama | Título | Dependencias | Status |
|---|---|---|---|---|
| T15 | `task/T15-shifts-pages` | Shifts pages (lista + detalle + cierre) | T09, T10 | `pending` |
| T16 | `task/T16-workers-page` | Workers page + actions | T09, T10 | `pending` |
| T17 | `task/T17-terminal` | Terminal adapter + API route + page | T02, T03 | `pending` |

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

**Oleada 1** (después de T01): T02, T03, T04, T05 → **4 agentes en paralelo**

**Oleada 2** (después de oleada 1): T06, T07, T08, T09, T10 → **hasta 5 agentes en paralelo**

**Oleada 3** (después de oleada 2): T11, T12, T13, T14, T15, T16, T17 → **hasta 7 agentes en paralelo**

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
| Framework | Next.js 15, App Router |
| UI | shadcn/ui + Tailwind CSS (paleta emerald) |
| Auth / DB | Supabase + @supabase/ssr (cookie-based) |
| Estado cliente | Zustand (persistido en localStorage) |
| Data fetching | Server Components (fetches) + Server Actions (mutaciones) |
| Test | Vitest + @testing-library/react |
| Terminal | Clase Terminal (proxy a agente Hikvision local) |

## Variables de entorno requeridas

```bash
# .env.local (no commiteado)
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env>
```

## Fuente de datos

Mismo proyecto Supabase que `kraken-web`. La migración en T05 agrega la tabla `shifts` y columnas `shift_id` + `registered_by` en `payments` — cambios aditivos, no rompen nada existente.

---

## Historial

| Fecha | Agente | Acción |
|---|---|---|
| 2026-04-13 | Claude Sonnet 4.6 | Creó spec, plan, AGENTS.md, CLAUDE.md, GEMINI.md |

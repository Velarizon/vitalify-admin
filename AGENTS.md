# Vitalify Admin — Agent Coordination Board

Este archivo es el punto de entrada para todos los agentes (Claude, GPT, Gemini, u otros LLMs) que trabajen en este proyecto. Contiene el estado de cada tarea, quién la tiene asignada, y cómo colaborar sin pisarse.

---

## Documentos de referencia

| Documento | Ruta |
|---|---|
| Plan de implementación (tareas detalladas con código) | `docs/superpowers/plans/2026-04-13-vitalify-admin.md` |
| Spec de diseño (arquitectura, decisiones, DB schema) | `docs/superpowers/specs/2026-04-13-vitalify-admin-design.md` |

---

## Protocolo para agentes

### Antes de empezar una tarea
1. Lee este archivo para ver qué tareas están disponibles (`status: pending`)
2. Verifica que sus dependencias estén `completed`
3. Actualiza este archivo: cambia tu tarea a `status: in_progress` y pon tu nombre en `agent`
4. Lee la tarea completa en el plan antes de escribir código

### Al completar una tarea
1. Haz commit del código con el mensaje indicado en el plan
2. Actualiza este archivo: cambia tu tarea a `status: completed`
3. Deja una nota en `notes` si encontraste algo importante para los siguientes agentes

### Reglas de concurrencia
- **No tomes una tarea con dependencias pendientes.** Si la Task N requiere que Task M esté `completed`, espera.
- **Una tarea = un agente.** Si está `in_progress`, no la tomes.
- **Este archivo es la fuente de verdad.** Si hay conflicto entre el plan y este archivo, prevalece este archivo.
- **Haz commit de AGENTS.md junto con cada cambio de status.**

---

## Task Board

### Phase 1: Foundation

| ID | Título | Dependencias | Agent | Status | Notes |
|---|---|---|---|---|---|
| T01 | Scaffold Next.js 15 + Vitest | — | — | `pending` | |
| T02 | shadcn/ui + Tailwind emerald + dark mode | T01 | — | `pending` | |
| T03 | Supabase clients + tipos | T01 | — | `pending` | Copiar .env de kraken-web |
| T04 | Zustand stores (auth + preferences) | T01 | — | `pending` | |
| T05 | DB migration (shifts) + computeShiftTotals | T01 | — | `pending` | Requiere acceso a Supabase Dashboard |
| T06 | Middleware auth + role routing | T03, T04 | — | `pending` | |

### Phase 2: Auth & Shell

| ID | Título | Dependencias | Agent | Status | Notes |
|---|---|---|---|---|---|
| T07 | Login page + auth actions | T03, T04 | — | `pending` | |
| T08 | Sidebar + Topbar + Dashboard layout | T02, T04 | — | `pending` | Incluye shift warning en logout |
| T09 | ShiftBlocker modal + shifts actions base | T03, T05 | — | `pending` | Bloqueo obligatorio para WORKER |

### Phase 3: Migrated screens

| ID | Título | Dependencias | Agent | Status | Notes |
|---|---|---|---|---|---|
| T10 | Shared DataTable + MetricCard | T02 | — | `pending` | Base para todas las pantallas de datos |
| T11 | Dashboard page | T09, T10 | — | `pending` | |
| T12 | Clients page + CreateClientSheet | T09, T10 | — | `pending` | Sheet 3 pasos: datos, biométrico, suscripción |
| T13 | Payments page + actions | T09, T10 | — | `pending` | Columnas registered_by + shift_id |
| T14 | Plans, Locations, Reports pages | T09, T10 | — | `pending` | |

### Phase 4: New features

| ID | Título | Dependencias | Agent | Status | Notes |
|---|---|---|---|---|---|
| T15 | Shifts pages (lista + detalle + cierre) | T09, T10 | — | `pending` | Flujo completo de corte de caja |
| T16 | Workers page + actions | T09, T10 | — | `pending` | |
| T17 | Terminal adapter + API route + page | T02, T03 | — | `pending` | Copiar lógica de kraken-web/src/utils/terminal/terminal.ts |

---

## Mapa de dependencias

```
T01 ──┬──► T02 ──┬──► T08
      │          └──► T10 ──┬──► T11
      ├──► T03 ──┬──► T06   ├──► T12
      │          ├──► T07   ├──► T13
      │          ├──► T09 ──┤──► T14
      │          └──► T17   ├──► T15
      ├──► T04 ──┬──► T06   └──► T16
      │          ├──► T07
      │          └──► T08
      └──► T05 ──► T09
```

### Tareas paralelizables una vez que T01 está completo

- T02, T03, T04, T05 se pueden ejecutar **en paralelo** (sin dependencias entre sí)
- T06, T07 pueden correr en paralelo una vez T03 y T04 estén listos
- T08 puede correr en paralelo con T06/T07 una vez T02 y T04 estén listos
- T09 puede correr en paralelo con T07/T08 una vez T03 y T05 estén listos
- T10 puede correr en paralelo con T07/T08/T09 una vez T02 esté listo
- T11–T16 pueden correr **en paralelo entre sí** una vez T09 y T10 estén listos

---

## Stack del proyecto

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15, App Router |
| UI | shadcn/ui + Tailwind CSS (paleta emerald) |
| Auth / DB | Supabase + @supabase/ssr (cookie-based) |
| Estado cliente | Zustand (persistido en localStorage) |
| Data fetching | Server Components (fetches iniciales) + Server Actions (mutaciones) |
| Test | Vitest + @testing-library/react |
| Terminal | Clase Terminal (proxy al agente Hikvision local) |

## Variables de entorno requeridas

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copiar de kraken-web/.env>
```

## Fuente de datos

El proyecto usa el **mismo proyecto Supabase que kraken-web**. No crear uno nuevo. La DB ya tiene las tablas `clients`, `subscriptions`, `plans`, `payments`, `locations`, `companies`, `user_access`. La migración en T05 agrega `shifts` y columnas nuevas en `payments`.

---

## Historial de agentes

| Fecha | Agente | Acción |
|---|---|---|
| 2026-04-13 | Claude Sonnet 4.6 (kraken-web session) | Creó spec, plan, y este archivo de coordinación |

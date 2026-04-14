# Vitalify Admin — Context for Gemini CLI

## Lo que eres

Eres un agente de implementación trabajando en **Vitalify Admin**, un panel de administración para gimnasios construido con Next.js 15 + shadcn/ui + Supabase.

## Lo primero que debes hacer al iniciar

1. Lee `AGENTS.md` — es el tablero de coordinación multi-agente
2. Encuentra una tarea con `status: pending` cuyas dependencias estén `completed`
3. Lee la tarea completa en `docs/superpowers/plans/2026-04-13-vitalify-admin.md`
4. Actualiza `AGENTS.md`: pon tu nombre en `agent` y cambia status a `in_progress`
5. Implementa la tarea paso a paso siguiendo el plan exactamente
6. Al terminar: commit del código + actualiza AGENTS.md a `completed`

## Documentos clave

- `AGENTS.md` — Task board (fuente de verdad del estado de cada tarea)
- `docs/superpowers/plans/2026-04-13-vitalify-admin.md` — Plan completo con código
- `docs/superpowers/specs/2026-04-13-vitalify-admin-design.md` — Diseño y arquitectura

## Variables de entorno

Necesitas un `.env.local` con:
```
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<pedir al usuario>
```

## Stack

Next.js 15 App Router · shadcn/ui · Tailwind CSS emerald · Supabase SSR · Zustand · Vitest

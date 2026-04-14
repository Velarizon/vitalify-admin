# Vitalify Admin — Context for Claude Code

## Lo que eres

Eres un agente de implementación trabajando en **Vitalify Admin**, un panel de administración para gimnasios y clubes deportivos construido con Next.js 15 + shadcn/ui + Supabase.

## Lo primero que debes hacer al iniciar

1. Lee `AGENTS.md` — es el tablero de coordinación multi-agente
2. Encuentra una tarea con `status: pending` cuyas dependencias estén `completed`
3. Usa `superpowers:subagent-driven-development` o `superpowers:executing-plans` para ejecutar la tarea
4. Actualiza `AGENTS.md` con tu nombre y el nuevo status antes y después de trabajar

## Documentos clave

- `AGENTS.md` — Task board (fuente de verdad del estado de cada tarea)
- `docs/superpowers/plans/2026-04-13-vitalify-admin.md` — Plan completo con código para cada tarea
- `docs/superpowers/specs/2026-04-13-vitalify-admin-design.md` — Diseño y arquitectura

## Variables de entorno

Necesitas un `.env.local` en la raíz con:
```
NEXT_PUBLIC_SUPABASE_URL=https://ekpujtewohbquqjwtowr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<pedir al usuario — está en kraken-web/.env>
```

## Stack

Next.js 15 App Router · shadcn/ui · Tailwind CSS emerald · Supabase SSR · Zustand · Vitest

## Reglas importantes

- Cada tarea tiene su propio commit (mensaje exacto en el plan)
- No empezar una tarea si sus dependencias no están `completed` en AGENTS.md
- Actualizar AGENTS.md en el mismo commit que el código de la tarea
- El proyecto vive en este directorio — no modificar kraken-web

# Vitalify Admin — Context for Claude Code

## Lo que eres

Eres un agente de implementación trabajando en **Vitalify Admin**, un panel de administración para gimnasios y clubes deportivos construido con Next.js 15 + shadcn/ui + Supabase.

## Lo primero que debes hacer al iniciar

1. Lee `AGENTS.md` — es el tablero de coordinación multi-agente
2. Verifica qué tareas están libres: `git branch -a | grep task/` (si no existe la rama, la tarea está libre)
3. Verifica que las dependencias de tu tarea estén mergeadas en `main`
4. Crea un worktree aislado: `git worktree add ../vitalify-admin-T{ID} -b task/T{ID}-{slug}`
5. Lee la tarea completa en `docs/superpowers/plans/2026-04-13-vitalify-admin.md`
6. Implementa paso a paso siguiendo el plan exactamente
7. Al terminar: commit + merge a main + limpiar worktree (ver protocolo completo en AGENTS.md)

## Documentos clave

- `AGENTS.md` — Task board + protocolo worktrees (fuente de verdad)
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

- La existencia de la rama `task/T{ID}-*` indica que la tarea está tomada — no la dupliques
- Cada tarea tiene su propio commit (mensaje exacto en el plan)
- No empezar una tarea si sus dependencias no están mergeadas en `main`
- Tu worktree es aislado — no te preocupes por conflictos con otros agentes
- El proyecto vive en este directorio — no modificar kraken-web

# Vitalify Admin — Design Spec

**Date:** 2026-04-13  
**Project:** Migración de kraken-web a Vitalify Admin  
**Output path:** `/Users/krissk1ng/Documents/kraken/vitalify-admin`

---

## Overview

Migración completa del software de gestión para gimnasios y clubes deportivos (kraken-web) a un nuevo proyecto Next.js con UI moderna, sistema de roles, turnos/corte de caja y trazabilidad total de operaciones.

El nuevo proyecto se llama **Vitalify Admin** y es el panel de administración de la plataforma Vitalify.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15, App Router |
| UI Components | shadcn/ui |
| Estilos | Tailwind CSS, paleta emerald |
| Backend / DB | Supabase (mismo proyecto existente) |
| Auth | Supabase SSR (cookie-based) |
| Estado cliente | Zustand con persistencia en localStorage |
| Data fetching | Server Components para fetches iniciales; Server Actions para mutaciones |
| Terminal adapter | Clase `Terminal` existente, proxiada via API route de Next.js |

---

## Diseño visual

- **Layout:** Sidebar mini colapsable (solo iconos por defecto, se expande al hacer clic/hover)
- **Densidad:** Data-dense — filas compactas, más información visible, barra de herramientas arriba de tablas
- **Paleta:** Emerald como color primario (`emerald-700` sidebar, `emerald-500` accents)
- **Modos:** Claro y oscuro (toggle en topbar)
- **Tipografía:** Inter (via `next/font`)

---

## Estructura del proyecto

```
vitalify-admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            ← sidebar mini + turno activo check (WORKER)
│   │   ├── page.tsx              ← dashboard
│   │   ├── clients/
│   │   │   └── page.tsx
│   │   ├── payments/
│   │   │   └── page.tsx
│   │   ├── plans/
│   │   │   └── page.tsx
│   │   ├── locations/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── monthly-payments/
│   │   │       └── page.tsx
│   │   ├── shifts/
│   │   │   ├── page.tsx          ← lista de turnos
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← detalle de turno
│   │   ├── workers/
│   │   │   └── page.tsx
│   │   └── terminal/
│   │       └── page.tsx
│   └── api/
│       └── terminal/
│           └── route.ts          ← proxy al agente Hikvision local
├── components/
│   ├── ui/                       ← shadcn/ui generados
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── shift-blocker.tsx     ← modal bloqueante de turno para WORKER
│   └── shared/
│       ├── data-table.tsx        ← tabla reutilizable data-dense
│       └── metric-card.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← browser client
│   │   ├── server.ts             ← server client (Server Components / Actions)
│   │   └── actions/
│   │       ├── auth.ts
│   │       ├── clients.ts
│   │       ├── payments.ts
│   │       ├── plans.ts
│   │       ├── locations.ts
│   │       ├── shifts.ts
│   │       ├── workers.ts
│   │       └── dashboard.ts
│   └── terminal.ts               ← Terminal adapter (lógica de kraken-web)
├── middleware.ts                  ← protección de rutas + verificación de rol
├── stores/
│   ├── auth.ts                   ← isAuthenticated, userData, role
│   └── preferences.ts            ← selectedLocation
└── types/
    └── supabase.ts               ← tipos generados (mismo archivo actual)
```

---

## Auth & Role-based routing

### Sesión

La sesión pasa de localStorage (Zustand-only) a **cookie-based** usando `@supabase/ssr`. Esto permite que `middleware.ts` lea la sesión en el servidor sin JavaScript.

Zustand se mantiene para datos de UI: empresa activa, ubicación seleccionada.

### Middleware (`middleware.ts`)

1. Verifica cookie de sesión Supabase
2. Si no hay sesión → redirige a `/login`
3. Si hay sesión → consulta `user_access` para obtener rol
4. Redirige si el rol no tiene acceso a la ruta solicitada

### Matriz de acceso por rol

| Ruta | ADMIN | WORKER |
|---|---|---|
| `/` (dashboard) | ✅ | ✅ |
| `/clients` | ✅ | ✅ |
| `/payments` | ✅ | ✅ |
| `/plans` | ✅ | ❌ |
| `/locations` | ✅ | ❌ |
| `/reports` | ✅ | ❌ |
| `/shifts` | ✅ todos | ✅ solo el suyo |
| `/workers` | ✅ | ❌ |
| `/terminal` | ✅ | ❌ |

### SUPER_ADMIN

Queda como **future scope**. El rol existe en la DB (`user_access.role`) pero no se implementa en esta iteración. Se diseña el middleware para que sea extensible.

---

## Pantallas

### Migradas del proyecto actual

| Pantalla | Notas |
|---|---|
| Login | Cookie-based, redirect por rol post-login |
| Dashboard | Métricas + gráficas. Ingresos mensuales habilitados. Filtro por ubicación activa. |
| Clientes | Tabla densa con estado de suscripción, foto, acciones. Modal de creación en 3 pasos igual que actual. |
| Pagos | + columna `Registrado por`, + columna `Turno` |
| Planes | CRUD completo, migración directa |
| Ubicaciones | Migración directa |
| Reportes | Estructura actual + skeleton para reportes futuros |
| Terminal (Agente) | Config Hikvision + indicador de estado de conexión |

### Nuevas pantallas

**`/shifts` — Lista de turnos**
- Tabla de todos los turnos (pasados + activo si existe)
- Columnas: fecha, trabajador, apertura, cierre, efectivo, tarjeta, otros, total
- Botón "Abrir turno" visible solo si no hay turno activo
- WORKER solo ve sus propios turnos; ADMIN ve todos

**`/shifts/[id]` — Detalle de turno**
- Todos los pagos del turno con: cliente, monto, método de pago, registrado por, hora
- Resumen al pie: totales por método de pago
- Botón "Cerrar turno" si es el turno activo del usuario

**`/workers` — Trabajadores**
- Lista de usuarios con rol WORKER o ADMIN en la empresa
- Nombre, email, rol, ubicación asignada
- Acción: invitar nuevo trabajador por email (Supabase invite)

---

## Turnos / Corte de caja

### Tabla `shifts` (nueva)

```sql
shifts:
  id              serial PK
  location_id     FK → locations
  opened_by       uuid → auth.users
  opened_at       timestamptz DEFAULT now()
  closed_at       timestamptz NULL  -- NULL = turno activo
  cash_amount     numeric DEFAULT 0
  card_amount     numeric DEFAULT 0
  other_amount    numeric DEFAULT 0
  total_amount    numeric DEFAULT 0
  notes           text NULL
```

### Cambios en tabla `payments`

```sql
payments:
  + shift_id        integer NULL FK → shifts   -- NULL para pagos de ADMIN sin turno
  + registered_by   uuid NULL → auth.users     -- siempre presente
```

### Flujo WORKER

1. Login → `(dashboard)/layout.tsx` verifica si existe turno activo para ese user + location
2. Sin turno activo → `<ShiftBlocker />` renderiza modal fullscreen bloqueante (sin cierre posible)
3. Usuario confirma apertura → Server Action `shifts.open()` → turno creado
4. Topbar muestra badge "Turno abierto · Xh Ym"
5. Todos los pagos registrados en este periodo incluyen `shift_id` automáticamente
6. Botón "Cerrar sesión" → verifica turno activo → si existe, muestra aviso y bloquea logout
7. Para cerrar sesión: ir a `/shifts/[id]` → cerrar turno → logout desbloqueado

### Flujo ADMIN

- Sin restricción de turno
- `shift_id = null` en pagos registrados por ADMIN
- `registered_by` siempre presente para trazabilidad

---

## Trazabilidad de pagos

Cada pago en la DB contiene:
- `subscription_id` → qué cliente/suscripción
- `amount` + `payment_method` → cuánto y cómo
- `payment_date` → cuándo
- `registered_by` → quién (user_id del admin o worker)
- `shift_id` → en qué turno (null si fue ADMIN sin turno)
- `location_id` → en qué sucursal

Esto permite queries como:
- "Todos los pagos del turno #14"
- "Total cobrado por el worker Juan en efectivo este mes"
- "Pagos registrados por admin fuera de turno"

---

## Terminal Hikvision

La clase `Terminal` de `kraken-web` se copia a `lib/terminal.ts` sin cambios funcionales.

Se agrega `app/api/terminal/route.ts` como proxy HTTP para evitar problemas de CORS en producción. El frontend llama a `/api/terminal/*` y el API route reenvía al agente local (`http://localhost:8000` o la IP configurada).

La pantalla de configuración (`/terminal`) sigue guardando la IP del agente en localStorage igual que hoy.

---

## Cambios al esquema de Supabase

1. Crear tabla `shifts` con las columnas descritas arriba
2. Agregar columna `shift_id` (nullable FK) a `payments`
3. Agregar columna `registered_by` (nullable uuid) a `payments`
4. Crear índices en `shifts(opened_by, location_id)` y `payments(shift_id)`

Los cambios son aditivos — no rompen el proyecto actual (`kraken-web`) mientras ambos coexisten.

---

## Fuera de scope (esta iteración)

- SUPER_ADMIN (ver todos los tenants)
- Reconocimiento facial propio
- Reportes adicionales (altas/bajas de clientes, ingresos por plan, reporte general)
- App móvil

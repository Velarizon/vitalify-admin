---
name: vitalify-context
description: Carga el contexto completo del ecosistema Vitalify y la integración de reconocimiento facial. Úsala al empezar a trabajar en tareas que involucren RecFacialApi, embeddings, sincronización facial, check-in/acceso al gym, face_recognition_desktop, el reemplazo de Hikvision, o el flujo de altas/bajas/membresías de clientes en vitalify-admin.
---

# Contexto del ecosistema Vitalify

Vitalify es una plataforma para gestión de gimnasios: pagos, membresías, clientes, accesos y reportes. Una empresa puede tener varios gimnasios; toda la info se centraliza en Supabase.

## Piezas del ecosistema

```
face_recognition_desktop          vitalify-admin              Supabase
(PySide6 + cv2)                   (recepción del gym)         (datos de todos
   │                                   │                        los gyms)
   │ detecta rostro (~60%)             │ alta/baja usuarios          ▲
   │ manda frame ─────┐                │ membresías + renovación ────┤
   ▼                  │                │ accesos                     │
RecFacialApi ◄────────┘ ◄──────────────┘ sync al crear/editar/       │
(FastAPI + embeddings                    renovar + status biométrico  │
 + búsqueda vectorial)                                                │
   │                                                                  │
   └─ devuelve datos del usuario en el check-in ─────────────────────┘

   ▶ Objetivo estratégico: RecFacialApi + face_recognition_desktop
     reemplazan a Hikvision (torniquete + reconocimiento facial).
```

- **vitalify-admin** (este repo): app instalada en la computadora de recepción del gym. Gestiona altas/bajas de usuarios, alta/baja/renovación de membresías y accesos. Sube todo a Supabase, donde la empresa accede a la info de todos sus gimnasios. Stack: Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn (base-nova, tema Neon Dark) + Supabase SSR + Zustand v5.
- **RecFacialApi**: API (FastAPI/SQLModel) de reconocimiento facial. Usa **embeddings + búsqueda vectorial** para identificar rápido al usuario en el check-in y devolver sus datos. vitalify-admin se comunica con ella al dar de alta, editar datos personales/biométricos, renovar membresía y consultar estatus biométrico.
- **face_recognition_desktop**: app Python + PySide6 que hace el check-in. Usa cv2 para detectar rostros; cuando tiene ~60% de confianza de que hay un rostro, manda el frame a RecFacialApi, que devuelve la info del usuario vía búsqueda vectorial.

## Integración vitalify-admin ↔ RecFacialApi

- **Cliente**: `lib/facial-api.ts` (singleton `FacialApi`).
- **Proxy routes**: `app/api/facial-sync/*` — inyectan el header `vitalify-sync-key`. Requieren env `FACIAL_API_URL` + `FACIAL_SYNC_KEY` (si faltan, devuelven 503).
- **Operaciones**:
  - `registerUser` → `POST /api/sync/user` (crea el usuario en RecFacialApi). `membership` es opcional.
  - `updateUser` → `PATCH /api/sync/user` (datos personales y/o `profile_picture_url`/`user_image_base64` para regenerar embedding).
  - `getUserStatus` → `POST /api/sync/user/status` (estatus biométrico).
  - `updateMembership` → `PUT /api/sync/membership`.

### Estatus biométrico (`getUserStatus`)

Siempre responde `success: true`, `error_type: null`. El estado vive en `data.status`:

| status | significado | acción en UI |
|---|---|---|
| `ok` | registrado con imagen + embedding | panel verde "sincronización activa" |
| `not_found` | existe en vitalify pero **no** en RecFacialApi | botón "Registrar usuario en Facial API" |
| `no_image` | registrado sin imagen | actualizar foto vía "Guardar biométricos" |
| `no_embedding` | imagen sin rostro válido | recapturar foto |

Errores reales (HTTP no-ok / conexión) llegan por el `catch`; `error_type: 'CONNECTION_ERROR'` indica API offline.

### Dónde está la UI de sincronización

- `components/clients/create-client-wizard.tsx` — al alta, dispara `registerUser` (no bloqueante).
- `components/clients/edit-client-dialog.tsx`, tab **Biométricos** — muestra el estatus y permite `updateUser` ("Guardar biométricos") y `registerUser` ("Registrar usuario en Facial API", visible solo si `status === 'not_found'`).
- `components/clients/renew-membership-dialog.tsx` — renovación dispara `updateMembership`.

## Pendientes conocidos

- **Bulk de ~200 usuarios**: tabla que liste usuarios que existen en vitalify pero no en RecFacialApi para registrarlos en lote. RecFacialApi ya expone `get_users_pending_embedding` (usuarios activos sin embedding) y `process_bulk` (recibe lista de `UserSyncPayload`).

## Notas

- El código de Terminal/Hikvision (`lib/terminal.ts`) sigue presente pero en transición; parte está comentado en el wizard. La dirección es migrar accesos a RecFacialApi.
- No modificar `kraken-web` (proyecto hermano que comparte la misma base Supabase).

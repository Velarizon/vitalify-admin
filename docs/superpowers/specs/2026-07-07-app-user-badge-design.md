# Badge de usuario de app en lista de clientes

## Problema

En `/clients` no hay forma de saber, a simple vista, qué miembros ya tienen
cuenta en la app Vitalify. El flujo de enrolamiento (`VitalifyEnrollDialog` →
`POST /api/vitalify/enroll-member` → `createGymMember()`) ya recibe un
`clientId` del proyecto Supabase del trainer-app al enrolar exitosamente,
pero ese dato se descarta — nunca se persiste en la tabla `clients` local.
No existe hoy ninguna columna, flag o tabla que indique "este cliente tiene
la app".

## Diseño

**1. Columna nueva** — `clients.vitalify_client_id` (`text`, nullable).
Migración nueva en `supabase/migrations/`. La presencia/ausencia de este
valor *es* el flag de "tiene app" — no se agrega un boolean separado.

**2. Persistencia al enrolar** — en
`app/api/vitalify/enroll-member/route.ts`, después de que
`createGymMember()` responde exitosamente, actualizar la fila del cliente en
el proyecto Supabase del admin (no el del trainer-app):
`update('clients').set({ vitalify_client_id: result.clientId }).eq('id', clientId)`.
Se revisará si `renew-membership-dialog.tsx` invoca este mismo endpoint o un
path de enrolamiento propio; si es un call site separado que también llama
`createGymMember`, recibe el mismo patch.

**3. Types** — `types/supabase.ts` no tiene esta columna (mismo problema de
staleness que `companies.vitalify_id`, `vitalify_email`, `vitalify_password`
documentado en CLAUDE.md). Se sigue la convención existente del proyecto:
cast `as any`/`as never` en el `select`/`update` en vez de regenerar tipos.

**4. UI** — en `app/(dashboard)/clients/page.tsx`, se agrega una columna
nueva al array `columns` (mismo nivel que "Estado de Enlace"), usando el
componente `Badge` (`components/ui/badge.tsx`) ya usado en
`edit-client-dialog.tsx`:

```tsx
row.original.vitalify_client_id
  ? <Badge className="bg-primary text-primary-foreground text-[9px] uppercase tracking-widest h-4 gap-1">
      <Smartphone className="h-2.5 w-2.5" /> App
    </Badge>
  : null
```

`Smartphone` ya está importado en ese archivo (se usa en el botón de
enrolar).

## Fuera de alcance

- No se modifica el comportamiento del botón "App" existente (sigue
  apareciendo aunque el cliente ya esté enrolado).
- No se hace backfill de clientes ya enrolados antes de este cambio — el
  badge solo reflejará enrolamientos posteriores a la migración, a menos que
  se decida un backfill manual por separado.
- No se consulta el proyecto remoto del trainer-app en vivo; todo se basa en
  el flag local.

## Testing

- Verificar que tras un enrolamiento exitoso vía `VitalifyEnrollDialog`, la
  fila del cliente en `/clients` muestra el badge sin necesidad de recargar
  manualmente el estado global (usa el mismo `load()`/`onEnrolled` callback
  ya presente).
- Verificar que clientes sin `vitalify_client_id` no muestran el badge.

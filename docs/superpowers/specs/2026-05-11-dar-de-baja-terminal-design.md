# Diseño: Dar de baja / Alta en terminal Hikvision

**Fecha:** 2026-05-11  
**Branch:** fix/search-clients

## Contexto

Los clientes que dejan de renovar su membresía durante periodos largos deben ser eliminados del terminal facial Hikvision para liberar espacio y revocar acceso. Sin embargo, sus datos deben persistir en Supabase para poder reactivarlos en el futuro con los mismos datos biométricos (excepto huella, que se vuelve a capturar).

La columna `is_sync` (boolean) ya existe en la tabla `clients` de Supabase pero no está declarada en los tipos generados (`types/supabase.ts`). Se trata igual que `is_active` en planes: usando `as any`.

## Archivos a modificar

### 1. `lib/supabase/browser-catalogs.ts`

Extender `ClientRow` para incluir `is_sync`:

```ts
type ClientRow = Database['public']['Tables']['clients']['Row'] & {
  is_sync?: boolean | null   // columna existente en DB, no en tipos generados
  subscriptions: ...
}
```

### 2. `components/clients/edit-client-dialog.tsx`

**Prop `client`** — agregar campo:
```ts
is_sync?: boolean | null
```

**Estado nuevo:**
- `isSynced: boolean` — inicializado desde `client?.is_sync ?? false`, actualizado después de cada operación
- `terminalLoading: boolean` — spinner durante operación baja/alta
- `showConfirm: 'baja' | 'alta' | null` — controla el dialog de confirmación

**Header del dialog** — junto al badge de estado (Activo/Vencido), agregar botón condicional:
- `isSynced === true` → botón destructivo "Dar de baja" con ícono `UserMinus`
- `isSynced !== true` → botón primario "Dar de alta" con ícono `UserPlus`
- Deshabilitado cuando `!terminalConfigured || terminalLoading`

**Dialog de confirmación** — un solo `Dialog` parametrizado por `showConfirm`:
- "baja": explica que se elimina del terminal, no de Supabase
- "alta": muestra fechas de la suscripción activa; si no hay suscripción, advertencia de que se creará sin fechas

## Flujo de acciones

### Dar de baja

```
1. Click → setShowConfirm('baja')
2. Confirmar →
   Terminal.deleteUser(String(client.id))
   supabase.from('clients').update({ is_sync: false } as any).eq('id', client.id)
   setIsSynced(false)
   toast.success('Cliente dado de baja del terminal')
   onSuccess()
```

### Dar de alta

```
1. Click → setShowConfirm('alta')
2. Confirmar →
   Terminal.createPerson({
     user_id: String(client.id),
     name: client.name,
     last_name: client.last_name,
     gender: client.gender,
     start_date: subscription?.start_date ?? '',
     end_date: subscription?.end_date ?? '',
   })
   if (client.image_url) Terminal.setUpFaceImage(String(client.id), client.image_url)
   supabase.from('clients').update({ is_sync: true } as any).eq('id', client.id)
   setIsSynced(true)
   toast.success('Cliente dado de alta en el terminal. Asigna la huella para activar acceso biométrico.')
   onSuccess()
```

## Manejo de errores

- Si `Terminal.deleteUser` falla → `toast.error`, no se actualiza Supabase ni el estado local
- Si `Terminal.createPerson` falla → `toast.error`, no se continúa con `setUpFaceImage` ni Supabase
- Si la actualización de Supabase falla → `toast.error`, el estado local NO se actualiza (permanece el valor anterior)
- Los bloques try/catch envuelven toda la secuencia, con `terminalLoading = false` en finally

## Cambios NO requeridos

- `lib/terminal.ts` — ya tiene `deleteUser()` y `createPerson()`
- FastAPI agent — ya tiene `/hikvision/delete-user`
- Migraciones de DB — `is_sync` ya existe
- `updateBrowserClient` — se llama directamente al cliente Supabase para el update de `is_sync`

## Fuera de scope

- Agregar `is_image_sync` al flujo (se puede hacer en otra iteración)
- Regenerar tipos de Supabase para incluir `is_sync`
- Mostrar estado de sincronización en la tabla de clientes

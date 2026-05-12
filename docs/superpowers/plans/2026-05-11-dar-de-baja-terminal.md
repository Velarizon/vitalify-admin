# Dar de Baja / Alta en Terminal Hikvision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar botón "Dar de baja / Alta" en el header del dialog de edición de cliente para eliminar o registrar al cliente en el terminal Hikvision, sin borrar sus datos de Supabase.

**Architecture:** Extender el tipo `ClientRow` con `is_sync` (columna existente en DB, no en tipos generados), añadir estado local `isSynced` al dialog, e implementar dos handlers que llaman a `Terminal.deleteUser` / `Terminal.createPerson` + actualizan `is_sync` en Supabase vía `updateBrowserClient`.

**Tech Stack:** Next.js 15 App Router · TypeScript · shadcn/ui Dialog · Supabase SSR client · lucide-react · Sonner toasts · `lib/terminal.ts` (Terminal singleton)

---

## File Map

| Archivo | Cambio |
|---------|--------|
| `lib/supabase/browser-catalogs.ts` | Agregar `is_sync?: boolean \| null` a `ClientRow` y a `updateBrowserClient` updates |
| `components/clients/edit-client-dialog.tsx` | Agregar estado `isSynced`, handlers `handleDarBaja`/`handleDarAlta`, dialog de confirmación, y botón en header |

---

## Task 1: Extender tipos en browser-catalogs.ts

**Files:**
- Modify: `lib/supabase/browser-catalogs.ts:6-15` (ClientRow type)
- Modify: `lib/supabase/browser-catalogs.ts:279-289` (updateBrowserClient)

- [ ] **Step 1: Agregar `is_sync` a `ClientRow`**

En `lib/supabase/browser-catalogs.ts`, localizar la definición de `ClientRow` (línea ~6) y agregar el campo:

```ts
type ClientRow = Database['public']['Tables']['clients']['Row'] & {
  is_sync?: boolean | null
  subscriptions?: {
    id: number
    plan_id: number | null
    start_date: string | null
    end_date: string | null
    plans?: { name: string | null } | null
  }[] | null
}
```

- [ ] **Step 2: Agregar `is_sync` al tipo de `updateBrowserClient`**

Localizar `updateBrowserClient` (línea ~279) y modificar el tipo del parámetro `updates` para incluir `is_sync`, más agregar `as any` al `.update()` call:

```ts
export async function updateBrowserClient(clientId: number, updates: {
  name?: string
  last_name?: string
  email?: string
  phone_number?: string
  date_of_birth?: string
  gender?: string
  image_url?: string | null
  is_sync?: boolean | null
}) {
  const supabase = createClient()
  const { error } = await supabase.from('clients').update(updates as any).eq('id', clientId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/browser-catalogs.ts
git commit -m "feat: extend ClientRow and updateBrowserClient with is_sync field"
```

---

## Task 2: Estados y handlers en EditClientDialog

**Files:**
- Modify: `components/clients/edit-client-dialog.tsx`

### 2a — Actualizar imports y tipo del prop

- [ ] **Step 1: Agregar imports de lucide-react (UserMinus, UserPlus)**

Localizar la línea de imports de lucide-react (~línea 14) y extenderla:

```ts
import { User, Fingerprint, CreditCard, History, Save, X, Camera, RotateCcw, ShieldCheck, WifiOff, Loader2, UserMinus, UserPlus } from 'lucide-react'
```

- [ ] **Step 2: Agregar imports de Dialog extras**

Localizar la línea de imports de Dialog (~línea 5) y extenderla:

```ts
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
```

- [ ] **Step 3: Agregar `is_sync` al tipo del prop `client`**

Localizar la interfaz `Props` (~línea 25) y agregar el campo al tipo de `client`:

```ts
interface Props {
  client: {
    id: number
    name: string | null
    last_name: string | null
    email: string | null
    image_url: string | null
    phone_number: string | null
    date_of_birth: string | null
    gender: string | null
    is_sync?: boolean | null
    subscriptions?: Subscription[] | null
  } | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}
```

### 2b — Agregar estado nuevo

- [ ] **Step 4: Agregar los tres estados nuevos**

Localizar el bloque de `useState` al inicio del componente (~línea 89) y agregar después de los existentes:

```ts
const [isSynced, setIsSynced] = useState(false)
const [terminalLoading, setTerminalLoading] = useState(false)
const [showConfirm, setShowConfirm] = useState<'baja' | 'alta' | null>(null)
```

- [ ] **Step 5: Resetear `isSynced` cuando cambia el cliente**

Localizar el `useEffect` que resetea el formulario al cambiar `client` (~línea 109). Agregar `setIsSynced(client.is_sync ?? false)` dentro del `setTimeout`:

```ts
useEffect(() => {
  if (client) {
    const timeoutId = window.setTimeout(() => {
      setFormData({
        name: client.name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone_number: client.phone_number || '',
        date_of_birth: client.date_of_birth || '',
        gender: client.gender || 'M',
      })
      setFaceImage(client.image_url || null)
      setFingerprintData(null)
      setActiveTab('info')
      setPayments([])
      setPaymentsLoadedFor(null)
      setIsSynced(client.is_sync ?? false)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }
}, [client])
```

### 2c — Implementar handlers

- [ ] **Step 6: Agregar helper de formato de fecha y handler `handleDarBaja`**

Agregar después de `handleSave` (~línea 183) y antes de `capturePhoto`:

```ts
const formatTerminalDate = (d: string | null | undefined) => {
  if (!d) return ''
  return d.includes('T') ? d : `${d}T00:00:00.000`
}

const handleDarBaja = async () => {
  if (!client) return
  setShowConfirm(null)
  setTerminalLoading(true)
  const toastId = toast.loading('Eliminando del terminal...')
  try {
    await Terminal.deleteUser(String(client.id))
    await updateBrowserClient(client.id, { is_sync: false })
    setIsSynced(false)
    toast.success('Cliente dado de baja del terminal', { id: toastId })
    onSuccess()
  } catch (err) {
    toast.error((err as Error).message, { id: toastId })
  } finally {
    setTerminalLoading(false)
  }
}

const handleDarAlta = async () => {
  if (!client) return
  setShowConfirm(null)
  setTerminalLoading(true)
  const toastId = toast.loading('Registrando en terminal...')
  try {
    const sub = client.subscriptions?.[0]
    await Terminal.createPerson({
      user_id: String(client.id),
      name: client.name ?? '',
      last_name: client.last_name ?? '',
      gender: client.gender ?? 'M',
      start_date: formatTerminalDate(sub?.start_date),
      end_date: formatTerminalDate(sub?.end_date),
    })
    if (client.image_url) {
      await Terminal.setUpFaceImage(String(client.id), client.image_url)
    }
    await updateBrowserClient(client.id, { is_sync: true })
    setIsSynced(true)
    toast.success('Cliente dado de alta en el terminal. Asigna la huella para activar acceso biométrico.', { id: toastId })
    onSuccess()
  } catch (err) {
    toast.error((err as Error).message, { id: toastId })
  } finally {
    setTerminalLoading(false)
  }
}
```

- [ ] **Step 7: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sin errores nuevos.

- [ ] **Step 8: Commit**

```bash
git add components/clients/edit-client-dialog.tsx
git commit -m "feat: add isSynced state and dar de baja/alta handlers to EditClientDialog"
```

---

## Task 3: UI — Botón en header y dialog de confirmación

**Files:**
- Modify: `components/clients/edit-client-dialog.tsx`

### 3a — Botón en el header

- [ ] **Step 1: Agregar botón condicional en el header del dialog**

Localizar el `<DialogHeader>` (~línea 232). Dentro del `<div className="flex items-center justify-between">`, agregar el botón después del bloque `<div className="space-y-1">`:

```tsx
<DialogHeader className="p-6 pb-0">
  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <DialogTitle className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
        {client?.name} {client?.last_name}
        {isExpired ? (
          <Badge variant="destructive" className="text-[9px] uppercase tracking-widest h-4">Vencido</Badge>
        ) : (
          <Badge className="bg-primary text-primary-foreground text-[9px] uppercase tracking-widest h-4">Activo</Badge>
        )}
      </DialogTitle>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">ID: {client?.id.toString().padStart(6, '0')}</p>
    </div>
    {terminalConfigured && (
      isSynced ? (
        <Button
          variant="destructive"
          size="sm"
          className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2"
          onClick={() => setShowConfirm('baja')}
          disabled={terminalLoading}
        >
          {terminalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
          Dar de baja
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setShowConfirm('alta')}
          disabled={terminalLoading}
        >
          {terminalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
          Dar de alta
        </Button>
      )
    )}
  </div>
</DialogHeader>
```

### 3b — Dialog de confirmación

- [ ] **Step 2: Agregar dialog de confirmación**

Justo antes del `</Dialog>` de cierre del componente principal (~línea 549), insertar el dialog de confirmación parametrizado:

```tsx
{/* Dialog de confirmación baja/alta */}
<Dialog open={showConfirm !== null} onOpenChange={v => !v && setShowConfirm(null)}>
  <DialogContent className="sm:max-w-md bg-card border-border/40">
    <DialogHeader>
      <DialogTitle className="text-base font-heading font-bold">
        {showConfirm === 'baja' ? 'Confirmar baja en terminal' : 'Confirmar alta en terminal'}
      </DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground pt-2">
        {showConfirm === 'baja' ? (
          <>
            Se eliminará a <strong>{client?.name} {client?.last_name}</strong> del terminal facial.
            Sus datos permanecerán en el sistema y podrás darle de alta nuevamente en el futuro.
          </>
        ) : (
          <>
            Se registrará a <strong>{client?.name} {client?.last_name}</strong> en el terminal con
            {client?.subscriptions?.[0] ? (
              <> su suscripción vigente ({
                client.subscriptions[0].start_date
                  ? new Date(client.subscriptions[0].start_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
              } — {
                client.subscriptions[0].end_date
                  ? new Date(client.subscriptions[0].end_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
              }).</>
            ) : (
              <> sin fechas de suscripción (no tiene membresía activa).</>
            )}
            {' '}La huella debe asignarse por separado desde la pestaña Biométricos.
          </>
        )}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 pt-2">
      <Button variant="outline" size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest" onClick={() => setShowConfirm(null)}>
        Cancelar
      </Button>
      {showConfirm === 'baja' ? (
        <Button variant="destructive" size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest gap-2" onClick={handleDarBaja}>
          <UserMinus className="h-3 w-3" /> Confirmar baja
        </Button>
      ) : (
        <Button size="sm" className="h-9 text-[10px] uppercase font-bold tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleDarAlta}>
          <UserPlus className="h-3 w-3" /> Confirmar alta
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 3: Verificar tipos y build**

```bash
npx tsc --noEmit
npm run lint
```

Esperado: sin errores.

- [ ] **Step 4: Verificar en navegador**

1. Iniciar el servidor: `npm run dev`
2. Abrir un cliente con terminal configurada → verificar que aparece el botón en el header
3. Probar "Dar de baja": confirmar → debe desaparecer del terminal y el botón cambiar a "Dar de alta"
4. Probar "Dar de alta": confirmar → debe registrarse en el terminal y el botón volver a "Dar de baja"
5. Probar con terminal no configurada → botón no debe aparecer
6. Verificar que el campo `is_sync` se actualiza en Supabase (tabla `clients`)

- [ ] **Step 5: Commit**

```bash
git add components/clients/edit-client-dialog.tsx
git commit -m "feat: add dar de baja/alta button and confirmation dialog to EditClientDialog header"
```

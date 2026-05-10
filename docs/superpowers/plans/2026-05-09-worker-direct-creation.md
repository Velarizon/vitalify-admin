# Worker Direct Creation with Forced Password Change — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the email-invite worker onboarding flow with direct account creation: admin fills a form, system generates a one-time temp password shown in-app, and the worker is forced to change it on first login.

**Architecture:** Pure utility for password generation; `createWorker` server action replaces `inviteWorker` using `auth.admin.createUser()` with `must_change_password: true` in `user_metadata`; middleware enforces the flag by redirecting to `/set-password`; the set-password page supports both token-based and active-session flows and clears the flag on save.

**Tech Stack:** Next.js 15 App Router, Supabase Auth Admin API (`@supabase/supabase-js`), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/workers-utils.ts` | Create | `generateTempPassword()` pure utility |
| `lib/__tests__/workers-utils.test.ts` | Create | Unit tests for password generator |
| `lib/supabase/actions/workers.ts` | Modify | Replace `inviteWorker` → `createWorker`, return `tempPassword` |
| `app/api/workers/route.ts` | Modify | Handle `action: 'create'`, forward `tempPassword` |
| `app/(dashboard)/workers/page.tsx` | Modify | Update form dialog, add temp password reveal modal |
| `app/(auth)/set-password/page.tsx` | Modify | Support active-session path, clear `must_change_password` on save |
| `middleware.ts` | Modify | Redirect `must_change_password: true` users to `/set-password` |

---

## Task 1: Password Generator Utility + Tests

**Files:**
- Create: `lib/workers-utils.ts`
- Create: `lib/__tests__/workers-utils.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/workers-utils.test.ts
import { describe, it, expect } from 'vitest'
import { generateTempPassword } from '../workers-utils'

const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

describe('generateTempPassword', () => {
  it('returns a 12-character string', () => {
    expect(generateTempPassword()).toHaveLength(12)
  })

  it('only contains allowed characters (no ambiguous 0/O/l/1/I)', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateTempPassword()
      for (const char of pwd) {
        expect(ALLOWED_CHARS).toContain(char)
      }
    }
  })

  it('generates unique passwords', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()))
    expect(passwords.size).toBe(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- lib/__tests__/workers-utils.test.ts
```

Expected: FAIL — `Cannot find module '../workers-utils'`

- [ ] **Step 3: Implement `generateTempPassword`**

```typescript
// lib/workers-utils.ts
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTempPassword(length = 12): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- lib/__tests__/workers-utils.test.ts
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/workers-utils.ts lib/__tests__/workers-utils.test.ts
git commit -m "feat: add temp password generator utility"
```

---

## Task 2: Replace `inviteWorker` with `createWorker`

**Files:**
- Modify: `lib/supabase/actions/workers.ts`

- [ ] **Step 1: Remove the `inviteWorker` function and its unused import**

Open `lib/supabase/actions/workers.ts`. Delete the entire `inviteWorker` function (currently lines 136–174). Also remove `import { headers } from 'next/headers'` from the top since it was only used by `inviteWorker`.

- [ ] **Step 2: Add `generateTempPassword` import and `createWorker` function**

At the top of the file, add:

```typescript
import { generateTempPassword } from '@/lib/workers-utils'
```

After the `updateWorker` function, add:

```typescript
export async function createWorker(
  email: string,
  companyId: number,
  locationId: number,
  role: 'admin' | 'worker',
  profile?: { name?: string; last_name?: string }
): Promise<{ error: string | null; tempPassword: string | null }> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.', tempPassword: null }
  }

  const name = profile?.name?.trim() || undefined
  const lastName = profile?.last_name?.trim() || undefined
  const fullName = [name, lastName].filter(Boolean).join(' ') || undefined
  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      ...(name ? { name } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(fullName ? { full_name: fullName } : {}),
      must_change_password: true,
    },
  })
  if (createError) return { error: createError.message, tempPassword: null }

  const { error: accessError } = await adminClient.from('user_access').insert({
    user_id: created.user.id,
    company_id: companyId,
    location_id: locationId,
    role,
  })

  if (accessError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return { error: accessError.message, tempPassword: null }
  }

  revalidatePath('/workers')
  return { error: null, tempPassword }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/actions/workers.ts lib/workers-utils.ts
git commit -m "feat: replace inviteWorker with createWorker using direct account creation"
```

---

## Task 3: Update API Route

**Files:**
- Modify: `app/api/workers/route.ts`

- [ ] **Step 1: Update the import**

Open `app/api/workers/route.ts`. Replace:

```typescript
import { deactivateWorker, inviteWorker, updateWorker } from '@/lib/supabase/actions/workers'
```

With:

```typescript
import { createWorker, deactivateWorker, updateWorker } from '@/lib/supabase/actions/workers'
```

- [ ] **Step 2: Replace the `invite` handler with `create`**

Replace:

```typescript
if (body.action === 'invite') {
  const result = await inviteWorker(
    body.email,
    Number(body.companyId),
    Number(body.locationId),
    body.role as UserRole,
    body.profile
  )
  return NextResponse.json(result)
}
```

With:

```typescript
if (body.action === 'create') {
  const result = await createWorker(
    body.email,
    Number(body.companyId),
    Number(body.locationId),
    body.role as UserRole,
    body.profile
  )
  return NextResponse.json(result)
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/workers/route.ts
git commit -m "feat: update workers API route to use createWorker action"
```

---

## Task 4: Update Workers Page UI

**Files:**
- Modify: `app/(dashboard)/workers/page.tsx`

This task has four sub-steps. Read the full file before starting.

- [ ] **Step 1: Update types, state, and add `Copy` import**

At the top of the file, add `Copy` to the lucide-react import:

```typescript
import { UserPlus, Pencil, ShieldAlert, ShieldCheck, MapPin, Mail, Copy } from 'lucide-react'
```

Replace the `InviteForm` type and `emptyInviteForm` constant:

```typescript
type CreateForm = {
  name: string
  last_name: string
  email: string
  role: UserRole
  location_id: string
}

const emptyCreateForm: CreateForm = {
  name: '',
  last_name: '',
  email: '',
  role: 'worker',
  location_id: '',
}
```

Inside `WorkersPage`, replace:

```typescript
const [inviteOpen, setInviteOpen] = useState(false)
const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInviteForm)
const [savingInvite, setSavingInvite] = useState(false)
```

With:

```typescript
const [createOpen, setCreateOpen] = useState(false)
const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm)
const [savingCreate, setSavingCreate] = useState(false)
const [tempPassword, setTempPassword] = useState<string | null>(null)
```

- [ ] **Step 2: Replace `openInvite` and `handleInvite` handlers**

Replace `openInvite`:

```typescript
const openCreate = () => {
  setCreateForm({
    name: '',
    last_name: '',
    email: '',
    role: 'worker',
    location_id: String(locations[0]?.id ?? ''),
  })
  setCreateOpen(true)
}
```

Replace `handleInvite`:

```typescript
const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  if (!userData) return

  setSavingCreate(true)
  try {
    const { error, tempPassword: pwd } = await postWorkerAction({
      action: 'create',
      email: createForm.email.trim(),
      companyId: userData.company.id,
      locationId: Number(createForm.location_id),
      role: createForm.role,
      profile: {
        name: createForm.name,
        last_name: createForm.last_name,
      },
    }) as { error: string | null; tempPassword: string | null }

    if (error) {
      toast.error(error)
      return
    }

    setCreateOpen(false)
    setCreateForm(emptyCreateForm)
    setTempPassword(pwd)
    await loadData()
  } finally {
    setSavingCreate(false)
  }
}
```

Also update the `useEffect` that pre-selects location (currently references `inviteForm`):

```typescript
setCreateForm((current) => ({
  ...current,
  location_id: current.location_id || String(locationRows[0]?.id ?? ''),
}))
```

- [ ] **Step 3: Update the header button and replace the create dialog JSX**

Replace the header button:

```tsx
<Button size="sm" className="h-8 px-4 text-[10px] uppercase font-bold tracking-widest gap-2 bg-primary text-primary-foreground shadow-neon" onClick={openCreate}>
  <UserPlus size={14} /> Agregar Personal
</Button>
```

Replace the entire invite `<Dialog>` block (from `<Dialog open={inviteOpen}` to its closing `</Dialog>`) with:

```tsx
<Dialog open={createOpen} onOpenChange={setCreateOpen}>
  <DialogContent className="sm:max-w-md bg-card border-border/40">
    <DialogHeader>
      <DialogTitle className="font-heading font-bold text-lg">Agregar Personal</DialogTitle>
    </DialogHeader>

    <form className="space-y-4 pt-4" onSubmit={handleCreate}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="worker-name" className="text-technical">Nombre</Label>
          <Input
            id="worker-name"
            value={createForm.name}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            required
            className="bg-background/50 border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-last-name" className="text-technical">Apellido</Label>
          <Input
            id="worker-last-name"
            value={createForm.last_name}
            onChange={(event) => setCreateForm((current) => ({ ...current, last_name: event.target.value }))}
            required
            className="bg-background/50 border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="worker-email" className="text-technical">Email</Label>
        <Input
          id="worker-email"
          type="email"
          value={createForm.email}
          onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
          required
          className="bg-background/50 border-border"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-technical">Rol de Acceso</Label>
          <Select
            value={createForm.role}
            onValueChange={(value) =>
              setCreateForm((current) => ({ ...current, role: value as UserRole }))
            }
            items={roleOptions}
          >
            <SelectTrigger className="w-full bg-background/50 border-border">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-technical">Ubicación Asignada</Label>
          <Select
            value={createForm.location_id}
            onValueChange={(value) => setCreateForm((current) => ({ ...current, location_id: value ?? '' }))}
            items={locations.map(l => ({ value: String(l.id), label: l.name }))}
          >
            <SelectTrigger className="w-full bg-background/50 border-border">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={String(location.id)}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon" disabled={savingCreate || !createForm.location_id}>
          {savingCreate ? 'Creando...' : 'Crear Cuenta'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Add the temp password reveal modal**

Insert this dialog immediately after the create dialog and before the edit dialog:

```tsx
<Dialog open={tempPassword !== null} onOpenChange={() => {}}>
  <DialogContent
    className="sm:max-w-sm bg-card border-border/40"
    onPointerDownOutside={(e) => e.preventDefault()}
    onEscapeKeyDown={(e) => e.preventDefault()}
  >
    <DialogHeader>
      <DialogTitle className="font-heading font-bold text-lg">Contraseña Temporal</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 pt-2">
      <p className="text-[11px] text-muted-foreground">
        Cuenta creada exitosamente. Entrega esta contraseña al trabajador en persona.
      </p>

      <div className="flex items-center gap-2">
        <code className="flex-1 px-4 py-3 rounded-lg bg-background border border-border font-mono text-base tracking-widest text-primary font-bold">
          {tempPassword}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 px-3"
          onClick={() => {
            if (tempPassword) void navigator.clipboard.writeText(tempPassword)
            toast.success('Copiado')
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
        <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">
          Esta contraseña no se volverá a mostrar.
        </p>
      </div>
    </div>

    <DialogFooter className="pt-2">
      <Button
        size="sm"
        className="h-9 px-6 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-neon"
        onClick={() => setTempPassword(null)}
      >
        Entendido
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/workers/page.tsx
git commit -m "feat: replace invite dialog with direct worker creation and temp password modal"
```

---

## Task 5: Update `/set-password` Page

**Files:**
- Modify: `app/(auth)/set-password/page.tsx`

The page currently handles two cases: a `code` param or a hash with tokens. Add support for a third case: user already has an active session (arrived via middleware redirect after logging in with temp password).

- [ ] **Step 1: Update `loadSession` to accept active sessions without tokens**

Replace the `loadSession` function body:

```typescript
async function loadSession() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
    window.history.replaceState(null, '', window.location.pathname)
  } else if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    window.history.replaceState(null, '', window.location.pathname)
  }

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    setError('No hay una sesión válida. Iniciá sesión con tu contraseña temporal primero.')
  }
  setCheckingSession(false)
}
```

The only change here is the error message — it now covers the direct-creation case. The logic already handles the active-session case correctly: if no code/hash is present, it skips the exchange and checks for an existing session directly.

- [ ] **Step 2: Clear `must_change_password` flag after saving**

In `handleSubmit`, after `supabase.auth.updateUser({ password })` succeeds and before fetching `getUser()`, add:

```typescript
await supabase.auth.updateUser({ data: { must_change_password: false } })
```

The full `handleSubmit` after the change:

```typescript
const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  setError(null)

  if (password.length < 6) {
    setError('La contraseña debe tener al menos 6 caracteres.')
    return
  }

  if (password !== confirmPassword) {
    setError('Las contraseñas no coinciden.')
    return
  }

  setLoading(true)
  const supabase = createClient()
  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    setError(updateError.message)
    setLoading(false)
    return
  }

  await supabase.auth.updateUser({ data: { must_change_password: false } })

  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (userId) {
    const { data: accessRows } = await supabase
      .from('user_access')
      .select('role, location:locations(*), company:companies(*)')
      .eq('user_id', userId)

    if (accessRows && accessRows.length > 0) {
      const firstAccess = accessRows[0] as { role: UserRole; company: UserData['company'] }
      const role = firstAccess.role
      const userData: UserData = {
        company: firstAccess.company,
        user_access: accessRows.map((access) => ({
          location: access.location as UserData['user_access'][number]['location'],
          role: access.role as UserRole,
        })),
      }

      setUserData(userData, role)
      if (userData.user_access.length > 0) {
        setSelectedLocation(userData.user_access[0])
      }
    }
  }

  router.replace('/')
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/set-password/page.tsx
git commit -m "feat: support active-session path in set-password and clear must_change_password flag"
```

---

## Task 6: Update Middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add `must_change_password` check inside the `if (user)` block**

Open `middleware.ts`. Inside the `if (user)` block, add the following two checks **before** the role lookup. The `user.user_metadata` is populated from the JWT returned by `supabase.auth.getUser()` — no extra DB query needed.

Replace:

```typescript
if (user) {
  let role: string | null | undefined = null
  try {
```

With:

```typescript
if (user) {
  const mustChangePassword = user.user_metadata?.must_change_password === true

  if (mustChangePassword && path !== '/set-password') {
    return NextResponse.redirect(new URL('/set-password', request.url))
  }

  if (!mustChangePassword && path === '/set-password') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  let role: string | null | undefined = null
  try {
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: enforce must_change_password redirect in middleware"
```

---

## Task 7: Full Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Create a worker as admin**

1. Log in as admin at `http://localhost:3000/login`
2. Go to `/workers`
3. Click "Agregar Personal"
4. Fill: Nombre, Apellido, Email (a real email you can log in with), Rol=Trabajador, Ubicación
5. Click "Crear Cuenta"
6. Verify: create dialog closes, temp password modal appears showing the email and a 12-char alphanumeric code
7. Click the copy button — verify "Copiado" toast appears
8. Click "Entendido" — modal closes, worker appears in the table

- [ ] **Step 3: First login as the new worker**

1. Open a private/incognito window
2. Go to `http://localhost:3000/login`
3. Log in with the worker's email and the copied temp password
4. Verify: after login, browser is redirected to `/set-password` (not to `/`)
5. Set a new password (min 6 chars, confirmed)
6. Verify: redirected to `/` (dashboard loads)
7. Try navigating to `/set-password` directly — verify it redirects back to `/`

- [ ] **Step 4: Verify normal subsequent logins**

1. Log out and log back in with the new password
2. Verify: goes directly to `/` without any `/set-password` redirect

- [ ] **Step 5: Verify rollback on DB error (manual)**

In Supabase dashboard, temporarily add a unique constraint violation scenario or simply verify that if you try to create a worker with an already-existing email you get a clear error in the UI (no orphaned auth user created).

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass, including the 3 new `workers-utils` tests

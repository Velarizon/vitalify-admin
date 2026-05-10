# Worker Direct Creation with Forced Password Change

**Date:** 2026-05-09
**Status:** Approved

## Problem

The current worker onboarding flow uses Supabase's email invitation system (`inviteUserByEmail`). This requires workers to have access to their email at the moment of setup, and introduces friction (email deliverability, spam filters, link expiry). The admin needs to create accounts directly and hand over credentials in person.

## Solution

Replace the email invitation flow with direct account creation. The admin sets name, last name, email, role, and location. The system generates a one-time temporary password shown in a modal. The worker logs in with it and is immediately redirected to `/set-password` where they must create their own password before accessing the app.

## Architecture

### 1. Account Creation

**Server action — `createWorker` (replaces `inviteWorker`):**
- Generates a 12-character alphanumeric temporary password using `crypto.getRandomValues` (no ambiguous chars: no `0`, `O`, `l`, `1`).
- Calls `auth.admin.createUser()` with:
  - `email_confirm: true` (skip email verification)
  - `password: tempPassword`
  - `user_metadata: { name, last_name, full_name, must_change_password: true }`
- Inserts a row in `user_access` with `user_id`, `company_id`, `location_id`, `role`.
- Returns `{ error: string | null, tempPassword: string | null }`.

**API route — `app/api/workers/route.ts`:**
- `action: 'create'` replaces `action: 'invite'`.
- Passes `tempPassword` through in the JSON response.

### 2. Temporary Password Modal

After a successful creation response, the workers page shows a second non-dismissible dialog (no close on backdrop click) with:
- Worker's email
- Generated temporary password with a "Copy" button
- Warning: "Esta contraseña no se volverá a mostrar. Entrégasela al trabajador en persona."
- A single "Entendido" button to close.

The temporary password is never stored client-side after the modal is closed.

### 3. Forced Password Change on First Login

**Middleware (`middleware.ts`):**
- After confirming the user is authenticated and before the admin-only path check, inspect `user.user_metadata?.must_change_password`. The `user_metadata` is available in the JWT returned by `supabase.auth.getUser()` — no extra DB query needed.
- If `true` and the current path is not `/set-password`, redirect to `/set-password`.
- If `false`/absent and the current path is `/set-password` with an active session, redirect to `/` (prevent unnecessary access).

**Page `/set-password`:**
- Existing logic handles two cases: invitation token in URL (code or hash) and already-active session.
- Add a third branch: if no token in URL but a session exists, skip the exchange step and render the form directly.
- After `supabase.auth.updateUser({ password })` succeeds, call `supabase.auth.updateUser({ data: { must_change_password: false } })` to clear the flag.
- Then redirect to `/`.

### 4. What Does Not Change

- Login identifier remains email.
- No new DB columns — the flag lives in Supabase Auth `user_metadata`.
- Edit and deactivate worker flows are untouched.
- `kraken-web` is not modified.

## Files Modified

| File | Change |
|------|--------|
| `lib/supabase/actions/workers.ts` | Replace `inviteWorker` with `createWorker`, return `tempPassword` |
| `app/api/workers/route.ts` | Handle `action: 'create'`, forward `tempPassword` |
| `app/(dashboard)/workers/page.tsx` | Update form dialog, add temp password reveal modal |
| `app/(auth)/set-password/page.tsx` | Support active-session path, clear `must_change_password` on save |
| `middleware.ts` | Add `must_change_password` metadata check before role check |

## Error Handling

- If `createUser` fails (e.g. email already exists), return `{ error }` with no `tempPassword`. The UI shows the error in the form dialog — no temp password modal opens.
- If the `user_access` insert fails after user creation, the orphaned auth user is deleted via `auth.admin.deleteUser()` before returning the error.
- If `must_change_password` flag fails to clear after password update, the user is already logged in with the new password and the middleware will redirect them again — acceptable degraded state, they simply set the password again.

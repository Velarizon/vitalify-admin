# Total Stitch Redesign — Full Implementation Plan

> **For agentic workers (Gemini CLI, Codex, Generalist):** Execute this plan task-by-task. Use the assigned branches to avoid merge conflicts. All designs must match the Stitch project **ID: `7911735482968559376`**.

**Goal:** Implementar el rediseño total (12 pantallas) siguiendo fielmente el diseño de Stitch, utilizando el sistema de diseño Neon Dark (Space Grotesk + #00FF9D).

---

## 🏗️ Phase 1: Infrastructure & Core (Agent: Gemini CLI)
**Focus:** Shared components and high-traffic entry points.

### Task 1.1: Tabs & Global Styling (Branch: `task/redesign-infra`)
- [ ] Install `@radix-ui/react-tabs`.
- [ ] Create `components/ui/tabs.tsx` (Stitch style: border-b only for active, no background).
- [ ] Ensure `Space Grotesk` is configured as the headline font in `tailwind.config.ts`.
- [ ] Add neon glassmorphism utility to `globals.css` for cards.

### Task 1.2: Dashboard & Auth (Branch: `task/redesign-core`)
- [ ] **Login (`c6cb2e3...`):** Port redesign with "Management Portal v2.4" subtitle, keep-session checkbox, and status footer.
- [ ] **Dashboard (`60a68cb...`):** 4 KPI Cards (Active, Revenue, Expirations, Birthdays) + Activity Grid.
- [ ] Update `getDashboardData` to include `expirationsSoon` and `birthdaysToday`.

---

## 👥 Phase 2: Client Management (Agent: Codex / Sub-agent A)
**Focus:** The membership lifecycle screens.

### Task 2.1: Clients List & Actions (Branch: `task/redesign-clients`)
- [ ] **Clients List (`c474187...`):** Redesign table to use inline "Editar" and "Renovar" buttons instead of dropdown menus.
- [ ] Use `MetricCard` style for top stats in the list.

### Task 2.2: Modals & Dialogs (Branch: `task/redesign-modals`)
- [ ] **Edit Client Modal (`bc46829...`):** Convert to 4-tab system (Info, Biometrics, Membership, Payments).
- [ ] **Renew Membership (`fe3b7d3...`):** Redesign as a clean, high-contrast dialog with plan selection cards.

### Task 2.3: The Wizard (Branch: `task/redesign-wizard`)
- [ ] **Create Client Wizard (`041765a...`, `62b1c12...`):** Update `create-client-wizard.tsx` to match the technical, HUD-like look of Stitch steps 1 and 2.

---

## ⚙️ Phase 3: Operations & Catalog (Agent: Generalist / Sub-agent B)
**Focus:** Backend management and configurations.

### Task 3.1: Operations (Branch: `task/redesign-ops`)
- [ ] **Payments List (`117d164...`):** Update table to match the new technical look, using badges for payment methods and status.
- [ ] **Workers (`ee1330c...`):** Implement the Avatar + Email column design.

### Task 3.2: Configuration (Branch: `task/redesign-config`)
- [ ] **Plans Catalog (`475049f...`):** Port the card-based layout for plans management.
- [ ] **Terminal Config (`9544c28...`):** Technical UI for device sync, using neon status indicators and monospace fonts for IDs.

---

## 🔍 Screen Reference Matrix (Project: 7911735482968559376)

| Screen | ID | Responsibility |
|---|---|---|
| Dashboard | `60a68cb61...` | Gemini CLI |
| Login | `c6cb2e3a3...` | Gemini CLI |
| Clients List | `c474187fb...` | Codex |
| Edit Client Modal | `bc46829da...` | Codex |
| Create Client (Wizard) | `041765a8b...` | Codex |
| Payments List | `117d164a2...` | Generalist |
| Workers | `ee1330c24...` | Generalist |
| Plans Catalog | `475049f82...` | Generalist |
| Terminal Config | `9544c284e...` | Generalist |
| Renew Membership | `fe3b7d36b...` | Codex |

---

## 🚦 Execution Order
1. **Gemini** starts Task 1.1 immediately (Blocking Infra).
2. **Codex** and **Generalist** can start their Phase 2/3 tasks as soon as 1.1 is merged into `main`.
3. Merges must be coordinated to avoid conflicts in `lib/supabase/actions/*`.

# Design Unification: vitalify-admin → vitalify-trainner-web

**Date:** 2026-04-21  
**Scope:** All pages and components in vitalify-admin  
**Goal:** Replicate the visual design system of vitalify-trainner-web without changing functionality

---

## 1. Decisions

| Question | Decision |
|---|---|
| Scope | All pages (dashboard, clients, payments, shifts, plans, locations, reports, workers, terminal) |
| Font | Replace Inter + Space Grotesk with Manrope (same as trainer-web) |
| Card decoration | Replace corner brackets with bottom accent line |
| Sidebar navigation groups | Keep "Principales" / "Administración" groups |
| Topbar functional elements | Keep (shift badge, "Abrir puerta", logout protection) — restyling only |

---

## 2. Section 1 — Design Tokens (`app/globals.css`)

The highest-impact change. All pages inherit these automatically via CSS variables.

### 2.1 Color Variables (`:root` and `.dark`)

| Variable | Current | Target |
|---|---|---|
| `--primary` | `#00FF9D` | `#13eca4` |
| `--primary-foreground` | `#00643a` | `#10221c` |
| `--background` | `#03110f` | `#10221c` |
| `--foreground` | `#ecfdf9` | `#ffffff` |
| `--card` | `#0a1d1a` | `rgba(25, 51, 43, 0.6)` |
| `--card-foreground` | `#ecfdf9` | `#ffffff` |
| `--popover` | `#0a1d1a` | `#19332b` |
| `--popover-foreground` | `#ecfdf9` | `#ffffff` |
| `--secondary` | `#142926` | `#0c5439` |
| `--secondary-foreground` | `#ecfdf9` | `#ffffff` |
| `--muted` | `#0f2320` | `#19332b` |
| `--muted-foreground` | `#9eafab` | `#92c9b7` |
| `--accent` | `#19302d` | `rgba(19, 236, 164, 0.15)` |
| `--accent-foreground` | `#ecfdf9` | `#13eca4` |
| `--destructive` | `#ff716c` | `#ef4444` |
| `--border` | `#3c4b48` | `rgba(255, 255, 255, 0.08)` |
| `--input` | `#3c4b48` | `rgba(25, 51, 43, 0.8)` |
| `--ring` | `#a0ffc3` | `#13eca4` |
| `--radius` | `0.5rem` | `1rem` |
| `--sidebar` | `#061614` | `#10221c` |
| `--sidebar-primary` | `#00FF9D` | `#13eca4` |
| `--sidebar-primary-foreground` | `#00643a` | `#10221c` |
| `--sidebar-accent` | `#142926` | `rgba(25, 51, 43, 0.8)` |
| `--sidebar-accent-foreground` | `#ecfdf9` | `#13eca4` |
| `--sidebar-border` | `#3c4b48` | `rgba(255, 255, 255, 0.05)` |
| `--sidebar-ring` | `#a0ffc3` | `#13eca4` |

### 2.2 `@theme inline` additions

Add to `@theme inline` block:
```css
--color-primary-container: #13eca4;
--color-surface-container: rgba(25, 51, 43, 0.6);
--radius-2xl: calc(var(--radius) * 1.8);
--radius-3xl: calc(var(--radius) * 2.2);
--radius-4xl: calc(var(--radius) * 2.6);
```

### 2.3 Font

Remove imports:
```
Inter (Google Fonts)
Space Grotesk (Google Fonts)
```

In `app/layout.tsx`, replace `inter` and `spaceGrotesk` next/font imports with:
```tsx
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

// In the body className:
<body className={manrope.variable}>
```

Update `@theme inline` in `globals.css`:
```css
--font-sans: var(--font-manrope);
--font-heading: var(--font-sans);
```

Update `body` base style:
```css
body {
  @apply bg-background text-foreground antialiased;
  font-family: "Manrope", system-ui, sans-serif;
}
```

Also remove the `.dark {}` block entirely — the app forces dark mode via `forcedTheme="dark"`, so the duplicate block is dead code.

### 2.4 Scrollbar Styling

Replace current scrollbar with:
```css
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-track { background: #10221c; }
::-webkit-scrollbar-thumb {
  background: #19332b;
  border-radius: 10px;
  border: 2px solid #10221c;
}
::-webkit-scrollbar-thumb:hover { background: #234238; }
```

### 2.5 Selection Styling

Add:
```css
::selection {
  background: #13eca4;
  color: #10221c;
}
```

### 2.6 Utility Classes

Replace `.neon-card` with `.glass-panel`:
```css
.glass-panel {
  background: rgba(25, 51, 43, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

Replace `.text-hud` with `.text-technical`:
```css
.text-technical {
  @apply uppercase tracking-widest font-bold;
  font-size: 0.75rem;
}
```

Add `.glow-primary`:
```css
.glow-primary {
  box-shadow: 0 4px 20px rgba(19, 236, 164, 0.15);
}
```

Add `.custom-scrollbar` utilities (for sidebar inner scroll):
```css
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(19, 236, 164, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(19, 236, 164, 0.4);
}
```

---

## 3. Section 2 — Layout Components

### 3.1 Sidebar (`components/layout/sidebar.tsx`)

**Active item state:**
- Remove: `border-l border-primary + glow box-shadow`
- Add: `glass-panel text-primary font-bold` (glassmorphism panel)

**Inactive item state:**
- `text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200`

**Item dimensions:**
- Height: `h-11` (44px) — standardize all nav items
- Border-radius: `rounded-lg`
- Padding: `px-4`

**Groups:** Keep "Principales" and "Administración" labels. Style labels with `.text-technical` (replacing `.text-hud` if used).

**Footer "Servidor Activo":** Keep functionality. Update dot to use `bg-primary glow-primary animate-pulse`.

### 3.2 Topbar (`components/layout/topbar.tsx`)

**Height:** `h-12` → `h-16`

**Background:** Add `bg-background/50 backdrop-blur-xl`

**Border:** Update to `border-b border-white/5`

**Functional elements (no change to logic):**
- Shift badge: keep, restyle border/colors to use `--primary` token
- "Abrir puerta" button: keep, restyle to `variant="outline"` with updated tokens
- Logout: keep with shift-active protection

---

## 4. Section 3 — Shared Components

### 4.1 MetricCard (`components/shared/metric-card.tsx`)

**Container:**
- Replace `neon-card hover:border-primary/30` with `glass-panel border-0 group transition-all duration-300 hover:scale-[1.02]`

**Remove:** Corner bracket decorations (`absolute top-0 right-0 w-8 h-8` with two `bg-primary` lines)

**Add:** Bottom accent line:
```tsx
<div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
```

**Value text:** Add `transition-colors group-hover:text-primary` if not already present

**Trend badge:** Update to `bg-primary/10 text-primary` (already may match)

### 4.2 DataTable (`components/shared/data-table.tsx`)

**Table container:** Update `rounded-xl border border-white/5 bg-background/20 backdrop-blur-sm` (same pattern, just verifying border token updates propagate)

**Toolbar:** Replace any `bg-secondary/10` with `bg-muted/20` to use updated muted token

**Pagination footer:** Replace `.text-hud` with `.text-technical`

**Table header text:** Keep `text-[9px] uppercase tracking-[0.2em]` — this already matches `.text-technical` style

---

## 5. Files to Change

| File | Change Type |
|---|---|
| `app/globals.css` | Major — tokens, fonts, utilities |
| `app/layout.tsx` | Minor — font imports |
| `components/layout/sidebar.tsx` | Medium — active/inactive states, item heights |
| `components/layout/topbar.tsx` | Minor — height, background |
| `components/shared/metric-card.tsx` | Medium — remove corner decoration, add bottom line |
| `components/shared/data-table.tsx` | Minor — class name updates |

---

## 6. Out of Scope

- Page structure/layout changes
- Route changes
- Business logic or auth changes
- Functional behavior of any component
- Adding new pages or features
- Changing component APIs

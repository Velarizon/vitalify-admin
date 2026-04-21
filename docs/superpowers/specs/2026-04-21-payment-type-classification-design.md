# Payment Type Classification Design

> Diferenciación de pagos por inscripción nueva vs renovación para métricas de retención de clientes.

**Goal:** Agregar clasificación automática de pagos como "nueva inscripción" o "renovación" para obtener insights sobre retención de clientes, sin breaking changes en la funcionalidad existente.

**Architecture:** Campo nullable en payments, lógica de detección en createPayment, visualización con badges y métricas agregadas en reportes.

**Tech Stack:** Supabase PostgreSQL, TypeScript Server Actions, React + TanStack Table

---

## Database Schema

### Nueva Columna en `payments`

```sql
ALTER TABLE payments 
ADD COLUMN payment_type TEXT NULL;
```

**Características:**
- Tipo: `TEXT` nullable
- Valores permitidos: `'new_subscription'` | `'renewal'` | `NULL`
- Sin constraints, foreign keys, ni índices inicialmente
- Pagos históricos mantienen `NULL` (no breaking change)
- Pagos futuros se clasifican automáticamente

**Manejo de NULL:**
- Reportes muestran "—" o "Sin clasificar" para pagos con `payment_type = NULL`
- Métricas de retención excluyen pagos NULL del cálculo
- No afecta queries existentes (columna nullable)

---

## Detection Logic

### En `createPayment()` Server Action

**Ubicación:** `lib/supabase/actions/payments.ts`

**Flujo:**

1. **Input validation** — el payment debe tener `subscription_id` no null
   - Si `subscription_id` es null → `payment_type: null` (pagos sin suscripción asociada)

2. **Obtener client_id:**
   ```typescript
   const { data: subscription } = await supabase
     .from('subscriptions')
     .select('client_id')
     .eq('id', payment.subscription_id)
     .single()
   ```

3. **Consultar suscripciones previas del cliente:**
   ```typescript
   const { count } = await supabase
     .from('subscriptions')
     .select('*', { count: 'exact', head: true })
     .eq('client_id', subscription.client_id)
     .neq('id', payment.subscription_id) // Excluir suscripción actual
   ```

4. **Clasificar:**
   - Si `count > 0` → `payment_type: 'renewal'` (cliente con historial)
   - Si `count === 0` → `payment_type: 'new_subscription'` (primera vez)

5. **Insertar payment con tipo calculado**

**Reglas de Negocio:**
- Cliente existente = cualquier suscripción previa en **cualquier ubicación** de la empresa
- Suscripciones expiradas cuentan como "previas" (cliente que regresa)
- La suscripción actual se excluye del conteo
- Sin límite de tiempo (cliente de hace 2 años que regresa = renovación)

**Performance:**
- 2 queries adicionales por pago creado (subscription lookup + count)
- Aceptable: createPayment no es operación masiva batch
- Se ejecuta solo una vez al crear, no en cada consulta de reportes

---

## UI Changes

### 1. Reporte de Pagos Mensuales (`/reports/monthly-payments`)

#### Tabla de Pagos

**Nueva columna "Tipo":**
- Posición: después de columna "Método"
- Renderizado:
  - `'new_subscription'` → Badge verde con texto "Nueva"
  - `'renewal'` → Badge azul con texto "Renovación"
  - `NULL` → "—"
- Incluir en export CSV como columna "Tipo"

**Código badge:**
```tsx
{
  header: 'Tipo',
  accessorKey: 'payment_type',
  cell: ({ row }) => {
    const type = row.original.payment_type
    if (!type) return '—'
    if (type === 'new_subscription') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Nueva</Badge>
    }
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Renovación</Badge>
  }
}
```

#### Métricas Agregadas

**Layout de 2 filas:**

**Fila 1 - Por Tipo (2 cards):**
- Card "Inscripciones Nuevas" — suma de `amount` donde `payment_type = 'new_subscription'`
- Card "Renovaciones" — suma de `amount` donde `payment_type = 'renewal'`

**Fila 2 - Por Método (4 cards existentes):**
- Efectivo, Tarjeta, Otros, Total (sin cambios)

**Tasa de Retención:**
- Texto debajo de cards: "Tasa de renovación: X%"
- Fórmula: `(renovaciones / (nuevas + renovaciones)) * 100`
- Solo cuenta pagos con tipo definido (excluye NULL)
- Formato: `{tasa.toFixed(1)}%`

**Grid layout:**
```tsx
<div className="grid gap-3 sm:grid-cols-2 mb-3">
  <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
  <MetricCard title="Renovaciones" value={fmt(renewals)} />
</div>
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <MetricCard title="Efectivo" value={fmt(cash)} />
  <MetricCard title="Tarjeta" value={fmt(card)} />
  <MetricCard title="Otros" value={fmt(other)} />
  <MetricCard title="Total ingresos" value={fmt(total)} />
</div>
<p className="text-xs text-muted-foreground">
  Tasa de renovación: {retentionRate}%
</p>
```

### 2. Detalles de Turno (`/shifts/[id]`)

#### Tabla de Pagos

- Misma columna "Tipo" con badges (idéntica a pagos mensuales)
- Incluir en export CSV si existe función de export

#### Métricas Agregadas

**Layout de 2 filas:**

**Fila 1 - Por Método (4 cards existentes):**
- Efectivo, Tarjeta, Otros, Total (sin cambios)

**Fila 2 - Por Tipo (2 cards nuevas):**
- Inscripciones Nuevas
- Renovaciones

**Grid layout:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  <MetricCard title="Efectivo" value={fmt(shift.cash_amount ?? 0)} />
  <MetricCard title="Tarjeta" value={fmt(shift.card_amount ?? 0)} />
  <MetricCard title="Otros" value={fmt(shift.other_amount ?? 0)} />
  <MetricCard title="Total" value={fmt(shift.total_amount ?? 0)} />
</div>
<div className="grid grid-cols-2 gap-3 mt-3">
  <MetricCard title="Inscripciones Nuevas" value={fmt(newSubscriptions)} />
  <MetricCard title="Renovaciones" value={fmt(renewals)} />
</div>
```

**Cálculo en frontend:**
```typescript
const newSubscriptions = payments
  .filter(p => p.payment_type === 'new_subscription')
  .reduce((sum, p) => sum + (p.amount ?? 0), 0)

const renewals = payments
  .filter(p => p.payment_type === 'renewal')
  .reduce((sum, p) => sum + (p.amount ?? 0), 0)
```

---

## Type Updates

### `types/supabase.ts`

Agregar `payment_type` a la definición de payments:

```typescript
payments: {
  Row: {
    // ... existing fields
    payment_type: string | null
  }
  Insert: {
    // ... existing fields
    payment_type?: string | null
  }
  Update: {
    // ... existing fields
    payment_type?: string | null
  }
}
```

---

## Migration Strategy

### Fase 1: Schema + Backend (Non-Breaking)
1. Ejecutar ALTER TABLE (dev → producción)
2. Actualizar tipos TypeScript
3. Modificar `createPayment()` con lógica de detección
4. Deploy backend

**Resultado:** Nuevos pagos se clasifican, existentes mantienen NULL, funcionalidad actual intacta.

### Fase 2: Frontend
1. Actualizar columnas de tablas con badges
2. Agregar métricas agregadas en reportes
3. Actualizar exports CSV
4. Deploy frontend

**Resultado:** Reportes muestran clasificación para pagos nuevos, "Sin clasificar" para históricos.

### Fase 3 (Opcional): Backfill Histórico
Si se necesita clasificar pagos históricos:
1. Script SQL que recorre pagos con `payment_type = NULL`
2. Para cada uno, ejecuta misma lógica de detección
3. Actualiza `payment_type`
4. Ejecutar en horario de bajo tráfico

**No requerido para MVP** — los datos históricos pueden quedar sin clasificar.

---

## Testing Checklist

### Backend
- [ ] Payment con cliente nuevo → `payment_type = 'new_subscription'`
- [ ] Payment con cliente existente (misma ubicación) → `payment_type = 'renewal'`
- [ ] Payment con cliente existente (otra ubicación) → `payment_type = 'renewal'`
- [ ] Payment sin subscription_id → `payment_type = NULL`
- [ ] Queries existentes de payments funcionan sin cambios

### Frontend
- [ ] Badge verde "Nueva" se muestra correctamente
- [ ] Badge azul "Renovación" se muestra correctamente
- [ ] Pagos históricos (NULL) muestran "—"
- [ ] Cards de métricas suman correctamente
- [ ] Tasa de renovación calcula correctamente
- [ ] Export CSV incluye columna "Tipo"
- [ ] Layout responsive funciona en mobile

---

## Edge Cases

1. **Cliente eliminado pero payment existe:**
   - Payment mantiene su `payment_type` original (ya calculado)
   - No afecta reportes

2. **Suscripción modificada después del payment:**
   - `payment_type` no se recalcula (snapshot al momento del pago)
   - Correcto: refleja la realidad al momento de la transacción

3. **Múltiples pagos en misma suscripción:**
   - Primer pago determina tipo según historial del cliente
   - Pagos adicionales de misma suscripción mantienen misma lógica
   - Ambos pueden ser "renovación" si el cliente ya tenía historial

4. **Cliente con gap de meses/años:**
   - Sigue contando como renovación (sin límite de tiempo)
   - Decisión de negocio: cliente que regresa después de años = renovación

5. **Payment sin subscription_id (edge case):**
   - `payment_type = NULL`
   - No rompe nada, métricas lo excluyen

---

## Future Enhancements

Fuera del scope actual, pero posibles iteraciones futuras:

1. **Breakdown por método de pago:**
   - ¿Nuevos clientes pagan más en efectivo?
   - ¿Renovaciones prefieren tarjeta?

2. **Alertas de retención:**
   - Notificar si tasa de renovación baja del X% en el mes

3. **Cohort analysis:**
   - Clientes inscritos en enero, ¿cuántos renovaron?

4. **Predicciones:**
   - Clientes próximos a vencer sin renovar aún

5. **Clasificación adicional:**
   - "Reactivación" para clientes con gap > 6 meses
   - vs "Renovación" para continuidad < 30 días

6. **Backfill automático:**
   - Background job que clasifica pagos históricos gradualmente

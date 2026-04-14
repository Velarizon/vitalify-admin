// lib/shifts.ts
export interface ShiftPayment {
  amount: number
  payment_method: string | null
}

export interface ShiftTotals {
  cash_amount: number
  card_amount: number
  other_amount: number
  total_amount: number
}

export function computeShiftTotals(payments: ShiftPayment[]): ShiftTotals {
  const cash_amount = payments
    .filter(p => p.payment_method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0)
  const card_amount = payments
    .filter(p => p.payment_method === 'card')
    .reduce((sum, p) => sum + p.amount, 0)
  const other_amount = payments
    .filter(p => p.payment_method !== 'cash' && p.payment_method !== 'card')
    .reduce((sum, p) => sum + p.amount, 0)
  return { cash_amount, card_amount, other_amount, total_amount: cash_amount + card_amount + other_amount }
}

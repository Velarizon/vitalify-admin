// lib/shifts.ts
export interface ShiftPayment {
  amount: number | null
  payment_method: string | null
}

export interface ShiftTotals {
  cash_amount: number
  card_amount: number
  other_amount: number
  total_amount: number
}

export function computeShiftTotals(payments: ShiftPayment[]): ShiftTotals {
  const totals = payments.reduce(
    (acc, p) => {
      const amount = p.amount ?? 0
      if (p.payment_method === 'cash') acc.cash_amount += amount
      else if (p.payment_method === 'card') acc.card_amount += amount
      else acc.other_amount += amount
      return acc
    },
    { cash_amount: 0, card_amount: 0, other_amount: 0 }
  )
  return {
    ...totals,
    total_amount: totals.cash_amount + totals.card_amount + totals.other_amount,
  }
}

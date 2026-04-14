// lib/__tests__/shifts.test.ts
import { describe, it, expect } from 'vitest'
import { computeShiftTotals } from '../shifts'

describe('computeShiftTotals', () => {
  it('suma correctamente por método de pago', () => {
    const payments = [
      { amount: 500, payment_method: 'cash' },
      { amount: 300, payment_method: 'cash' },
      { amount: 1000, payment_method: 'card' },
      { amount: 200, payment_method: 'transfer' },
    ]
    const result = computeShiftTotals(payments)
    expect(result.cash_amount).toBe(800)
    expect(result.card_amount).toBe(1000)
    expect(result.other_amount).toBe(200)
    expect(result.total_amount).toBe(2000)
  })

  it('retorna ceros para array vacío', () => {
    const result = computeShiftTotals([])
    expect(result.cash_amount).toBe(0)
    expect(result.card_amount).toBe(0)
    expect(result.other_amount).toBe(0)
    expect(result.total_amount).toBe(0)
  })

  it('trata métodos desconocidos como other', () => {
    const payments = [{ amount: 100, payment_method: 'crypto' }]
    const result = computeShiftTotals(payments)
    expect(result.other_amount).toBe(100)
    expect(result.total_amount).toBe(100)
  })

  it('trata payment_method null como other y amount null como cero', () => {
    const payments = [
      { amount: 150, payment_method: null },
      { amount: null, payment_method: 'cash' },
    ]
    const result = computeShiftTotals(payments)
    expect(result.other_amount).toBe(150)
    expect(result.cash_amount).toBe(0)
    expect(result.total_amount).toBe(150)
  })
})

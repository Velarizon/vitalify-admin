import { describe, it, expect } from 'vitest'
import { prorateAddon, ADDON_DAILY_RATE, MOBILE_APP_ADDON_PRICE } from '@/lib/vitalify/addon-proration'

const aug15 = new Date(2026, 7, 15)

describe('prorateAddon', () => {
  it('cobra solo los días que faltan hasta el fin de la mensualidad', () => {
    // 15-ago a 31-ago = 17 días contando ambos extremos.
    expect(prorateAddon('2026-08-31', aug15)).toEqual({
      days: 17,
      amount: 56.1,
      endDate: '2026-08-31',
    })
  })

  it('cobra un ciclo completo cuando faltan exactamente 30 días', () => {
    const result = prorateAddon('2026-09-13', aug15)
    expect(result?.days).toBe(30)
    expect(result?.amount).toBe(MOBILE_APP_ADDON_PRICE)
  })

  it('nunca cobra más de un mes, aunque el ciclo tenga 31 días', () => {
    const result = prorateAddon('2026-09-14', aug15)
    expect(result?.days).toBe(31)
    expect(result?.amount).toBe(MOBILE_APP_ADDON_PRICE)
  })

  it('cobra un solo día cuando la mensualidad vence hoy', () => {
    expect(prorateAddon('2026-08-15', aug15)).toEqual({
      days: 1,
      amount: Math.round(ADDON_DAILY_RATE * 100) / 100,
      endDate: '2026-08-15',
    })
  })

  it('bloquea el cobro si la mensualidad ya venció', () => {
    expect(prorateAddon('2026-08-14', aug15)).toBeNull()
  })

  it('bloquea el cobro si no hay fecha o es inválida', () => {
    expect(prorateAddon(null, aug15)).toBeNull()
    expect(prorateAddon(undefined, aug15)).toBeNull()
    expect(prorateAddon('', aug15)).toBeNull()
  })

  it('ignora la hora del end_date y acepta timestamps', () => {
    expect(prorateAddon('2026-08-31T23:59:59.000Z', aug15)?.days).toBe(17)
  })
})

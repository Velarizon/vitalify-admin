// lib/__tests__/vitalify-billing.test.ts
import { describe, it, expect } from 'vitest'
import { calculateAppSyncCharge, calculateInitialAppPaidUntil } from '../vitalify-billing'

describe('calculateAppSyncCharge', () => {
  it('prorratea el hueco entre lo ya pagado y la nueva fecha del gym (caso real: 8 días restantes de app, gym vencido, plan de 30 días)', () => {
    // App pagada hasta el 27 ago (8 días restantes). Gym vencido, renueva un
    // plan de 30 días desde hoy -> nueva fecha 18 sep. Hueco = 22 días.
    const appPaidUntil = '2026-08-27T00:00:00Z'
    const newGymEndDate = '2026-09-18T00:00:00Z'
    expect(calculateAppSyncCharge(appPaidUntil, newGymEndDate)).toBe(73) // round(99/30*22)
  })

  it('retorna 0 si el app ya está pagada más allá de la nueva fecha', () => {
    expect(calculateAppSyncCharge('2026-10-01T00:00:00Z', '2026-09-18T00:00:00Z')).toBe(0)
  })

  it('cobra el precio completo si nunca se activó (sin baseline)', () => {
    expect(calculateAppSyncCharge(null, '2026-09-18T00:00:00Z')).toBe(99)
  })

  it('cobra el precio completo si el hueco es mayor a un ciclo (>30 días, lleva mucho vencido)', () => {
    expect(calculateAppSyncCharge('2026-05-01T00:00:00Z', '2026-09-18T00:00:00Z')).toBe(99)
  })

  it('cobra el ciclo completo si el hueco es de exactamente 30 días', () => {
    expect(calculateAppSyncCharge('2026-08-19T00:00:00Z', '2026-09-18T00:00:00Z')).toBe(99)
  })

  it('ignora la hora del día al comparar (fecha gym en medianoche local vs app_paid_until en medianoche UTC)', () => {
    // Caso real: gym vence 6 sep, renueva a 6 oct -> `nextEndDate` sale de
    // parseISO + add, que arma medianoche LOCAL (aquí simulado en UTC-6 =
    // 06:00 UTC). App pagada hasta el 18 sep, guardada como medianoche UTC
    // exacta. El hueco en fechas calendario debe seguir siendo 18 días ($59),
    // no 20 días ($66) por el corrimiento de horas.
    const appPaidUntil = '2026-09-18T00:00:00Z'
    const targetEndDateWithTimeOffset = '2026-10-06T06:00:00Z'
    expect(calculateAppSyncCharge(appPaidUntil, targetEndDateWithTimeOffset)).toBe(59)
  })
})

describe('calculateInitialAppPaidUntil', () => {
  it('suma 30 días a partir de hoy', () => {
    const today = new Date('2026-08-19T00:00:00Z')
    expect(calculateInitialAppPaidUntil(today).toISOString()).toBe('2026-09-18T00:00:00.000Z')
  })
})

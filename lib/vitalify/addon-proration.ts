// lib/vitalify/addon-proration.ts
// Prorrateo del complemento App Móvil cuando se contrata a mitad del ciclo del gym.
// La app siempre vence el mismo día que la mensualidad, así que en la siguiente
// renovación ambos se cobran juntos y ya no hace falta ningún ajuste.

import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'

export const MOBILE_APP_ADDON_PRICE = 99

// Base fija de 30 días: el precio por día no cambia entre febrero y agosto, y es
// lo que se le explica al cliente en mostrador.
export const ADDON_BILLING_DAYS = 30
export const ADDON_DAILY_RATE = MOBILE_APP_ADDON_PRICE / ADDON_BILLING_DAYS

export interface AddonProration {
  /** Días de acceso cobrados, contando hoy y el día de vencimiento. */
  days: number
  /** Monto a cobrar, redondeado a centavos. */
  amount: number
  /** Fin del acceso a la app = fin de la mensualidad del gym (yyyy-MM-dd). */
  endDate: string
}

/**
 * Devuelve el cobro prorrateado hasta `gymEndDate`, o `null` si no hay una
 * mensualidad vigente con la cual sincronizar (sin fecha, inválida o ya vencida).
 * En ese caso el cobro se bloquea: primero hay que renovar la mensualidad.
 */
export function prorateAddon(
  gymEndDate: string | null | undefined,
  today: Date = new Date(),
): AddonProration | null {
  if (!gymEndDate) return null

  const end = startOfDay(parseISO(gymEndDate))
  if (Number.isNaN(end.getTime())) return null

  const days = differenceInCalendarDays(end, startOfDay(today)) + 1
  if (days < 1) return null

  // Tope al precio mensual: los planes son mensuales, y un ciclo de 31 días
  // cobraría $102.30 por lo que se anuncia como $99 al mes.
  const amount = Math.min(days * ADDON_DAILY_RATE, MOBILE_APP_ADDON_PRICE)

  return {
    days,
    amount: Math.round(amount * 100) / 100,
    endDate: gymEndDate.slice(0, 10),
  }
}

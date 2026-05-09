const HERMOSILLO_TIME_ZONE = 'America/Hermosillo'

export function formatHermosilloDateTime(value: string | null | undefined) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: HERMOSILLO_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatHermosilloTime(value: string | null | undefined) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: HERMOSILLO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

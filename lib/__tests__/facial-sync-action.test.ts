import { describe, it, expect } from 'vitest'
import { facialSyncAction } from '../facial-sync'

// El catch-all app/api/facial-sync/[[...action]] despacha con esto: si el parseo
// cambia, las 8 acciones dejan de resolver y todo responde 404.
describe('facialSyncAction', () => {
  const cases: [string, string][] = [
    ['https://x.com/api/facial-sync',                    ''],
    ['https://x.com/api/facial-sync/',                   ''],
    ['https://x.com/api/facial-sync/status',             'status'],
    ['https://x.com/api/facial-sync/bulk',               'bulk'],
    ['https://x.com/api/facial-sync/bulk/status',        'bulk/status'],
    ['https://x.com/api/facial-sync/embeddings',         'embeddings'],
    ['https://x.com/api/facial-sync/membership',         'membership'],
    ['https://x.com/api/facial-sync/register-existing',  'register-existing'],
    ['https://x.com/api/facial-sync/pending?companyId=1', 'pending'],
  ]

  it.each(cases)('%s -> %s', (url, expected) => {
    expect(facialSyncAction(url)).toBe(expected)
  })
})

import { describe, it, expect } from 'vitest'
import { generateTempPassword } from '../workers-utils'

const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

describe('generateTempPassword', () => {
  it('returns a 12-character string', () => {
    expect(generateTempPassword()).toHaveLength(12)
  })

  it('only contains allowed characters (no ambiguous chars: 0/O/o/l/1/I)', () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateTempPassword()
      for (const char of pwd) {
        expect(ALLOWED_CHARS).toContain(char)
      }
    }
  })

  it('generates unique passwords', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()))
    expect(passwords.size).toBe(20)
  })
})

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const VALID_BOUND = Math.floor(256 / CHARS.length) * CHARS.length // 224

export function generateTempPassword(length = 12): string {
  const result: string[] = []
  while (result.length < length) {
    const buf = new Uint8Array(length - result.length)
    crypto.getRandomValues(buf)
    for (const byte of buf) {
      if (result.length < length && byte < VALID_BOUND) {
        result.push(CHARS[byte % CHARS.length])
      }
    }
  }
  return result.join('')
}

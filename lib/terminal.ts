// lib/terminal.ts
// Proxy class to communicate with local Hikvision agent
export class Terminal {
  private static BASE_URL = 'http://localhost:8080/terminal' // local agent url

  static async openDoor() {
    try {
      const res = await fetch(`${this.BASE_URL}/open`, { method: 'POST' })
      return res.ok
    } catch (e) {
      console.error('Terminal error:', e)
      return false
    }
  }

  static async enrollFingerprint(userId: string) {
    try {
      const res = await fetch(`${this.BASE_URL}/enroll-fingerprint`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' }
      })
      return res.json()
    } catch (e) {
      return { error: 'No connection to local agent' }
    }
  }
}

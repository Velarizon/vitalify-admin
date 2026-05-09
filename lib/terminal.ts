// lib/terminal.ts
export interface FingerprintCapture {
  fingerPrintData: string
  fingerPrintQuality?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const findValue = (value: unknown, keys: string[]): unknown => {
  if (!isRecord(value)) return undefined

  for (const key of keys) {
    if (value[key] !== undefined) return value[key]
  }

  for (const child of Object.values(value)) {
    const result = findValue(child, keys)
    if (result !== undefined) return result
  }

  return undefined
}

const normalizeFingerprintCapture = (value: unknown): FingerprintCapture => {
  const fingerPrintData = findValue(value, ['fingerPrintData', 'fingerprintData', 'fingerData'])
  const fingerPrintQuality = findValue(value, ['fingerPrintQuality', 'fingerprintQuality', 'quality'])

  if (typeof fingerPrintData !== 'string' || !fingerPrintData.trim()) {
    throw new Error('No se recibió información válida de la huella.')
  }

  return {
    fingerPrintData,
    fingerPrintQuality: fingerPrintQuality === undefined ? undefined : Number(fingerPrintQuality),
  }
}

class Terminal {
  static get url() {
    if (typeof window === 'undefined') return 'http://localhost:8000'
    return localStorage.getItem('agentIp') || 'http://localhost:8000'
  }

  static get networkData() {
    if (typeof window === 'undefined') {
      return { terminal_url: '', username: 'admin', password: 'admin' }
    }

    return {
      terminal_url: localStorage.getItem('terminalIp') || '',
      username: localStorage.getItem('terminalUsername') || 'admin',
      password: localStorage.getItem('terminalPassword') || 'admin',
    }
  }

  static async getCapabilities(): Promise<string> {
    const response = await fetch(`${this.url}/`)
    return response.text()
  }

  static async readFingerPrint() {
    const response = await fetch(`${this.url}/hikvision/capture-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    const data = await response.json()
    return normalizeFingerprintCapture(data)
  }

  static async createPerson(req: {
    user_id: string
    name: string
    last_name: string
    gender: string
    start_date: string
    end_date: string
  }) {
    const response = await fetch(`${this.url}/hikvision/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    return response.json()
  }

  static async setUpFingerPrint(id: string, fingerprint: string) {
    if (!fingerprint?.trim()) {
      throw new Error('Captura la huella antes de sincronizarla con el terminal.')
    }

    const response = await fetch(`${this.url}/hikvision/setup-fingerprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fingerprint, ...this.networkData }),
    })
    return response.json()
  }

  static async setUpFaceImage(id: string, image_url: string) {
    const response = await fetch(`${this.url}/hikvision/setup-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, image_url, ...this.networkData }),
    })
    return response.json()
  }

  static async updateEndDate(req: { user_id: string; end_date: string }) {
    const response = await fetch(`${this.url}/hikvision/update-end-date`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, ...this.networkData }),
    })
    if (!response.ok) {
      throw new Error('No se pudo actualizar la fecha en el terminal.')
    }
    return response.json()
  }

  static async openDoor() {
    const response = await fetch(`${this.url}/hikvision/open-door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.networkData),
    })
    return response.json()
  }

  static async deleteUser(userId: string) {
    const response = await fetch(`${this.url}/hikvision/delete-user`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...this.networkData }),
    })
    return response.json()
  }
}

export { Terminal }
export default Terminal

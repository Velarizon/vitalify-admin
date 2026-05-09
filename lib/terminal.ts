// lib/terminal.ts
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
    return data.CaptureFingerPrint
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

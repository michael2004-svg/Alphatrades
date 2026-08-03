type TickCallback = (price: number, digit: number, epoch: number) => void
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void

const APP_ID  = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089'
const WS_URL  = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
const DEFAULT_ASSET   = '1HZ10V'
const PRELOAD_COUNT   = 100
// NEW: if no tick arrives within this window while "connected", treat the socket as dead
const TICK_STALE_MS = 8000

class DerivWebSocket {
  private ws: WebSocket | null = null
  private currentAsset = DEFAULT_ASSET
  private subscriptionId = ''
  private tickCallbacks: TickCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private watchdogTimer: NodeJS.Timeout | null = null   // NEW
  private lastTickAt = 0                                  // NEW
  private reconnectDelay = 1000
  private isIntentionalClose = false

  private historyListeners = new Map<number, {
    resolve: (prices: number[]) => void
    timer: NodeJS.Timeout
  }>()

  connect() {
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) return

    this.isIntentionalClose = false
    this.setStatus('connecting')
    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this.setStatus('connected')
      this.startPing()
      this.startWatchdog()          // NEW
      this.lastTickAt = Date.now()  // NEW — reset baseline on fresh connect
      this.preloadThenSubscribe(this.currentAsset)
    }

    this.ws.onmessage = (event) => {
      try { this.handleMessage(JSON.parse(event.data)) } catch {}
    }

    this.ws.onerror = () => {}

    this.ws.onclose = () => {
      this.setStatus('disconnected')
      this.stopPing()
      this.stopWatchdog()           // NEW
      if (!this.isIntentionalClose) this.scheduleReconnect()
    }
  }

  // NEW: periodically check whether ticks are still arriving
  private startWatchdog() {
    this.stopWatchdog()
    this.watchdogTimer = setInterval(() => {
      const silentFor = Date.now() - this.lastTickAt
      if (silentFor > TICK_STALE_MS) {
        console.warn('[Deriv WS] Stale connection detected — forcing reconnect')
        this.forceReconnect()
      }
    }, 3000)
  }

  private stopWatchdog() {
    if (this.watchdogTimer) { clearInterval(this.watchdogTimer); this.watchdogTimer = null }
  }

  // NEW: tear down the dead socket and reconnect immediately
  private forceReconnect() {
    this.stopPing()
    this.stopWatchdog()
    if (this.ws) {
      this.ws.onclose = null   // prevent double-handling
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
    this.connect()
  }

  private preloadThenSubscribe(asset: string) {
    const reqId = Date.now()
    const timer = setTimeout(() => {
      this.historyListeners.delete(reqId)
      this.doSubscribe(asset)
    }, 8000)
    this.historyListeners.set(reqId, {
      resolve: (prices) => {
        prices.forEach((price) => {
          const digit = parseInt(price.toFixed(2).slice(-1), 10)
          this.tickCallbacks.forEach(cb => cb(price, digit, 0))
        })
        this.doSubscribe(asset)
      },
      timer,
    })
    this.send({ ticks_history: asset, count: PRELOAD_COUNT, end: 'latest', style: 'ticks', req_id: reqId })
  }

  private handleMessage(data: any) {
    if (data.error) {
      console.error('[Deriv WS]', data.error.code, data.error.message)
      return
    }
    if (data.msg_type === 'tick') {
      const { quote, epoch, id } = data.tick
      if (id) this.subscriptionId = id
      const price  = parseFloat(quote)
      const digit  = parseInt(price.toFixed(2).slice(-1), 10)
      this.lastTickAt = Date.now()   // NEW — mark that a tick actually arrived
      this.tickCallbacks.forEach(cb => cb(price, digit, epoch))
    }
    if (data.msg_type === 'history') {
      const reqId: number = data.echo_req?.req_id
      const listener = this.historyListeners.get(reqId)
      if (listener) {
        clearTimeout(listener.timer)
        this.historyListeners.delete(reqId)
        listener.resolve(data.history?.prices ?? [])
      }
    }
  }

  private doSubscribe(asset: string) {
    if (this.subscriptionId) {
      this.send({ forget: this.subscriptionId })
      this.subscriptionId = ''
    }
    this.send({ ticks: asset, subscribe: 1 })
  }

  subscribe(asset: string) {
    this.currentAsset = asset
    this.lastTickAt = Date.now()   // NEW — reset baseline on manual asset switch too
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.preloadThenSubscribe(asset)
    } else {
      this.connect()
    }
  }

  getHistory(asset: string, count = 100): Promise<number[]> {
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) { resolve([]); return }
      const reqId = Date.now() + Math.floor(Math.random() * 9999)
      const timer = setTimeout(() => {
        this.historyListeners.delete(reqId)
        resolve([])
      }, 8000)
      this.historyListeners.set(reqId, { resolve, timer })
      this.send({ ticks_history: asset, count, end: 'latest', style: 'ticks', req_id: reqId })
    })
  }

  private send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => this.send({ ping: 1 }), 25000)
  }

  private stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }

  private setStatus(s: 'connecting' | 'connected' | 'disconnected') {
    this.statusCallbacks.forEach(cb => cb(s))
  }

  onTick(cb: TickCallback) {
    this.tickCallbacks.push(cb)
    return () => { this.tickCallbacks = this.tickCallbacks.filter(x => x !== cb) }
  }

  onStatus(cb: StatusCallback) {
    this.statusCallbacks.push(cb)
    return () => { this.statusCallbacks = this.statusCallbacks.filter(x => x !== cb) }
  }

  disconnect() {
    this.isIntentionalClose = true
    this.stopPing()
    this.stopWatchdog()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}

let _instance: DerivWebSocket | null = null

export function getDerivWs(): DerivWebSocket {
  if (typeof window === 'undefined') {
    return {
      connect: () => {}, subscribe: () => {}, disconnect: () => {},
      onTick: () => () => {}, onStatus: () => () => {},
      getHistory: async () => [],
    } as any
  }
  if (!_instance) {
    _instance = new DerivWebSocket()
    _instance.connect()
  }
  return _instance
}

export default DerivWebSocket
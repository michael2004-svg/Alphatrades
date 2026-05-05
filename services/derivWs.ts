type TickCallback = (price: number, digit: number, epoch: number) => void
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || '1089'
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`

class DerivWebSocket {
  private ws: WebSocket | null = null
  private currentAsset = ''
  private subscriptionId = ''
  private tickCallbacks: TickCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private reconnectDelay = 1000
  private isIntentionalClose = false
  private historyListeners: Map<number, {
    resolve: (prices: number[]) => void
    timer: NodeJS.Timeout
  }> = new Map()

  connect() {
  if (
    this.ws?.readyState === WebSocket.OPEN ||
    this.ws?.readyState === WebSocket.CONNECTING
  ) return

  this.isIntentionalClose = false
  this.setStatus('connecting')

  this.ws = new WebSocket(WS_URL)

  this.ws.onopen = () => {
    console.log('[Deriv] Connected')
    this.reconnectDelay = 1000
    this.setStatus('connected')
    this.startPing()
    if (this.currentAsset) this.doSubscribe(this.currentAsset)
  }

  this.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      this.handleMessage(data)
    } catch (e) {
      
    }
  }

  this.ws.onerror = (err) => {
  }

  this.ws.onclose = () => {
    console.log('[Deriv] Disconnected')
    this.setStatus('disconnected')
    this.stopPing()

    if (!this.isIntentionalClose) {
      this.scheduleReconnect()
    }
  }
}
  private handleMessage(data: any) {
    if (data.error) {
      console.error('[Deriv] Error:', data.error.code, data.error.message)
      return
    }

    if (data.msg_type === 'tick') {
      const { quote, epoch, id } = data.tick
      if (id) this.subscriptionId = id
      const price = parseFloat(quote)
      const digit = parseInt(price.toFixed(2).slice(-1), 10)
      this.tickCallbacks.forEach(cb => cb(price, digit, epoch))
    }

    if (data.msg_type === 'history') {
      const reqId: number = data.echo_req?.req_id
      const listener = this.historyListeners.get(reqId)
      if (listener) {
        clearTimeout(listener.timer)
        this.historyListeners.delete(reqId)
        listener.resolve(data.history?.prices || [])
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.doSubscribe(asset)
    } else {
      this.connect()
    }
  }

  getHistory(asset: string, count = 100): Promise<number[]> {
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        resolve([])
        return
      }
      const reqId = Date.now()
      const timer = setTimeout(() => {
        this.historyListeners.delete(reqId)
        resolve([])
      }, 8000)
      this.historyListeners.set(reqId, { resolve, timer })
      this.send({
        ticks_history: asset,
        count,
        end: 'latest',
        style: 'ticks',
        req_id: reqId,
      })
    })
  }

  getActiveSymbols(): Promise<any[]> {
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        resolve([])
        return
      }
      const reqId = Date.now()
      const timer = setTimeout(() => resolve([]), 8000)

      const originalOnMessage = this.ws!.onmessage
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.msg_type === 'active_symbols' && data.echo_req?.req_id === reqId) {
          clearTimeout(timer)
          this.ws!.onmessage = originalOnMessage
          resolve(data.active_symbols || [])
        }
      }
      // Temporarily add handler
      const prevOnMessage = this.ws!.onmessage
      this.ws!.onmessage = (event: MessageEvent) => {
        handler(event)
        if (prevOnMessage) (prevOnMessage as any)(event)
      }
      this.send({
        active_symbols: 'brief',
        product_type: 'basic',
        req_id: reqId,
      })
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
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}

let instance: DerivWebSocket | null = null

export function getDerivWs(): DerivWebSocket {
  if (typeof window === 'undefined') {
    return {
      connect: () => {},
      subscribe: () => {},
      onTick: () => () => {},
      onStatus: () => () => {},
      disconnect: () => {},
      getHistory: async () => [],
      getActiveSymbols: async () => [],
    } as any
  }
  if (!instance) instance = new DerivWebSocket()
  return instance
}

export default DerivWebSocket

type TradeMessage = { s: string; p: number; t: number }

type Status = 'connected' | 'disconnected' | 'no-key' | 'error' | 'connecting'

type TradeCallback = (payload: { symbol: string; price: number; timestamp: number }) => void
type StatusCallback = (status: { status: Status; reason?: string }) => void

/**
 * Simple singleton manager for Finnhub WebSocket subscriptions
 * - Responsible for opening a single socket, managing subscriptions, and dispatching trade messages
 * - Implements basic reconnect/backoff logic
 * - Keeps API key out of logs and avoids leaking it
 */
export class FinnhubSocketManager {
  private static _instance: FinnhubSocketManager | null = null
  private ws: WebSocket | null = null
  private url: string | null = null
  private subscribers: Map<string, Set<TradeCallback>> = new Map()
  private statusListeners: Set<StatusCallback> = new Set()
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private isClosing = false

  private constructor(private apiKey: string | undefined) {
    this.url = apiKey ? `wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}` : null
  }

  static getInstance(apiKey?: string) {
    if (!FinnhubSocketManager._instance) {
      FinnhubSocketManager._instance = new FinnhubSocketManager(apiKey)
    }
    // If instance exists but apiKey is provided and different, allow updating url
    if (apiKey && FinnhubSocketManager._instance.apiKey !== apiKey) {
      FinnhubSocketManager._instance.apiKey = apiKey
      FinnhubSocketManager._instance.url = `wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`
    }
    return FinnhubSocketManager._instance
  }

  addStatusListener(cb: StatusCallback) {
    this.statusListeners.add(cb)
  }
  removeStatusListener(cb: StatusCallback) {
    this.statusListeners.delete(cb)
  }

  private notifyStatus(status: Status, reason?: string) {
    this.statusListeners.forEach((cb) => {
      try {
        cb({ status, reason })
      } catch {
        // ignore
      }
    })
  }

  private connect() {
    if (!this.url) {
      // No API key available
      this.notifyStatus('no-key', 'Finnhub API key is missing')
      return
    }

    if (this.ws) return // already connected/connecting

    this.notifyStatus('connecting')
    this.ws = new WebSocket(this.url)
    this.isClosing = false

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.notifyStatus('connected')
      // Re-subscribe to existing symbols
      for (const symbol of this.subscribers.keys()) {
        this.send({ type: 'subscribe', symbol })
      }
    }

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        // Finnhub trade messages: { type: 'trade', data: [ { s, p, t } ] }
        if (data && data.type === 'trade' && Array.isArray(data.data)) {
          for (const item of data.data as TradeMessage[]) {
            const sym = (item.s || '').toUpperCase()
            const price = Number(item.p)
            const ts = Number(item.t) || Date.now()
            const subscribers = this.subscribers.get(sym)
            if (subscribers && subscribers.size > 0 && Number.isFinite(price)) {
              subscribers.forEach((cb) => {
                try {
                  cb({ symbol: sym, price, timestamp: ts })
                } catch {
                  // ignore
                }
              })
            }
          }
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    this.ws.onclose = (ev) => {
      this.ws = null
      if (this.isClosing) {
        this.notifyStatus('disconnected')
        return
      }
      // Unexpected close - schedule reconnect
      this.notifyStatus('disconnected', `Code ${ev.code}`)
      this.scheduleReconnect()
    }

    this.ws.onerror = (ev) => {
      // Notify listeners without exposing sensitive details
      this.notifyStatus('error', 'WebSocket error')
      // Close and allow reconnect logic to handle it
      try {
        this.ws?.close()
      } catch {
        // ignore
      }
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1
    const delay = Math.min(30000, 500 * Math.pow(2, this.reconnectAttempts)) // exponential backoff capped at 30s
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private send(msg: any) {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg))
      }
    } catch {
      // ignore send errors
    }
  }

  subscribe(symbol: string, cb: TradeCallback) {
    const sym = symbol.toUpperCase()
    const set = this.subscribers.get(sym) || new Set<TradeCallback>()
    set.add(cb)
    this.subscribers.set(sym, set)

    // Open connection if not open
    this.connect()

    // If ws is open, send subscribe message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol: sym })
    }

    // Return unsubscribe function
    return () => this.unsubscribe(sym, cb)
  }

  unsubscribe(symbol: string, cb: TradeCallback) {
    const sym = symbol.toUpperCase()
    const set = this.subscribers.get(sym)
    if (!set) return
    set.delete(cb)
    if (set.size === 0) {
      this.subscribers.delete(sym)
      // tell provider
      this.send({ type: 'unsubscribe', symbol: sym })
    }

    // If no subscribers left, close socket after short delay to allow re-subscribe
    if (this.subscribers.size === 0) {
      if (this.ws) {
        this.isClosing = true
        try {
          this.ws.close()
        } catch {
          // ignore
        }
        this.ws = null
      }
    }
  }

  isConnected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN
  }

  disconnect() {
    if (this.ws) {
      this.isClosing = true
      try {
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

export default FinnhubSocketManager

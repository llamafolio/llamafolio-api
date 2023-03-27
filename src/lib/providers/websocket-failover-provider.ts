import { IChainInfo } from '@lib/chains'
import { ethers } from 'ethers'

import { FailoverProvider } from './failover-provider'
import { createJsonRpcProvider } from './provider'

// See: https://github.com/ethers-io/ethers.js/issues/1053
const WEBSOCKET_PING_INTERVAL = 10000
const WEBSOCKET_PONG_TIMEOUT = 5000
const WEBSOCKET_RECONNECT_DELAY = 100

const WebSocketProviderClass = (): new () => ethers.providers.WebSocketProvider => class {} as never

export class WebSocketFailoverProvider extends WebSocketProviderClass() {
  private provider?: ethers.providers.WebSocketProvider | ethers.providers.FallbackProvider | FailoverProvider
  private events: ethers.providers.WebSocketProvider['_events'] = []
  private requests: ethers.providers.WebSocketProvider['_requests'] = {}
  private attempts = 0

  private handler = {
    get(target: WebSocketFailoverProvider, prop: string, receiver: unknown) {
      const value = target.provider && Reflect.get(target.provider, prop, receiver)

      return value instanceof Function ? value.bind(target.provider) : value
    },
  }

  constructor(private providerUrl: string, private chain: IChainInfo) {
    super()
    this.create()

    return new Proxy(this, this.handler)
  }

  private create() {
    if (this.provider) {
      this.events = [...this.events, ...this.provider._events]
      this.requests = { ...this.requests, ...(this.provider as ethers.providers.WebSocketProvider)._requests }
    }

    // switch to JsonRpcProvider
    if (this.attempts > 2) {
      console.error(`[${this.chain.id}] switch to json rpc provider`)
      const provider = createJsonRpcProvider(this.chain)

      // restart inflight requests (websocket connection closed during a call)
      let event
      while ((event = this.events.pop())) {
        provider._events.push(event)
        provider._startEvent(event)
      }

      for (const key in this.requests) {
        delete this.requests[key]
      }

      this.provider = provider
      return
    }

    const provider = new ethers.providers.WebSocketProvider(this.providerUrl, this.provider?.network?.chainId)
    let pingInterval: NodeJS.Timer | undefined
    let pongTimeout: NodeJS.Timeout | undefined

    provider._websocket.on('open', () => {
      pingInterval = setInterval(() => {
        provider._websocket.ping()

        pongTimeout = setTimeout(() => {
          provider._websocket.terminate()
        }, WEBSOCKET_PONG_TIMEOUT)
      }, WEBSOCKET_PING_INTERVAL)

      let event
      while ((event = this.events.pop())) {
        provider._events.push(event)
        provider._startEvent(event)
      }

      for (const key in this.requests) {
        provider._requests[key] = this.requests[key]
        provider._websocket.send(this.requests[key].payload)
        delete this.requests[key]
      }
    })

    provider._websocket.on('pong', () => {
      if (pongTimeout) clearTimeout(pongTimeout)
    })

    provider._websocket.on('close', (code: number) => {
      console.error(`[${this.chain.id}] wss connection closed, attempts ${this.attempts}`, code)
      this.attempts++
      provider._wsReady = false

      if (pingInterval) clearInterval(pingInterval)
      if (pongTimeout) clearTimeout(pongTimeout)

      if (code !== 1000) {
        setTimeout(() => this.create(), WEBSOCKET_RECONNECT_DELAY)
      }
    })

    this.provider = provider
  }
}

import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { defineReadOnly } from '@ethersproject/properties'
import { version } from '@ethersproject/providers/lib/_version'
import { timeout } from '@lib/promise'
import { ethers } from 'ethers'

const logger = new Logger(version)

export class FailoverProvider extends ethers.providers.BaseProvider {
  private failAll = false
  private providers: ethers.providers.BaseProvider[] = []
  private providerIdx = 0

  // StaticJsonRpcProvider: prevent eth_chainId calls as we know the network won't change
  async detectNetwork(): Promise<Network> {
    let network = this.network
    if (network == null) {
      network = await super.detectNetwork()

      if (!network) {
        logger.throwError('no network detected', Logger.errors.UNKNOWN_ERROR, {})
      }

      // If still not set, set it
      if (this._network == null) {
        // A static network does not support "any"
        defineReadOnly(this, '_network', network)

        this.emit('network', network, null)
      }
    }
    return network
  }

  constructor(providers: ethers.providers.BaseProvider[]) {
    logger.checkNew(new.target, FailoverProvider)
    super(providers[0].getNetwork())
    this.providers = providers
  }

  get provider() {
    return this.providers[this.providerIdx]
  }

  private nextProvider() {
    this.providerIdx = (this.providerIdx + 1) % this.providers.length
    console.log(`[${this.network.name}] next provider ${this.providerIdx} / ${this.providers.length - 1}`)
    return this.provider
  }

  async perform(method: string, params: any): Promise<any> {
    if (this.failAll) {
      console.log(`[${this.network.name}][${method}] provider fail all, skipping`)
      return undefined
    }

    let providerTryCount = 0

    while (providerTryCount < this.providers.length) {
      const timeoutError = new Error('timeout')

      try {
        return await timeout(this.provider.perform(method, params), 10_000, timeoutError)
      } catch (error) {
        if (error === timeoutError) {
          console.log(`[${this.network.name}][${method}] provider perform timeout`, params)
          providerTryCount++
          this.nextProvider()
        } else {
          return undefined
        }
      }
    }

    this.failAll = true

    return undefined
  }
}

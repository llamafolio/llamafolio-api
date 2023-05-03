import { Logger } from '@ethersproject/logger'
import type { Network } from '@ethersproject/networks'
import { defineReadOnly } from '@ethersproject/properties'
import { version } from '@ethersproject/providers/lib/_version'
import { poll } from '@ethersproject/web'
import { ethers } from 'ethers'

const logger = new Logger(version)

export interface RetryOptions {
  // Maximum time in total to retry
  timeout?: number

  // Minimum Duration to wait between retries
  floor?: number

  // Maximum Duration to wait between retries
  ceiling?: number

  // The slot interval for exponential back-off
  interval?: number

  // Maximum number of times to rety
  retryLimit?: number
}

export class RetryProvider extends ethers.providers.BaseProvider {
  readonly provider!: ethers.providers.BaseProvider
  readonly options!: RetryOptions

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

  constructor(provider: ethers.providers.BaseProvider, options?: RetryOptions) {
    logger.checkNew(new.target, RetryProvider)
    super(provider.getNetwork())
    defineReadOnly(this, 'provider', provider)
    defineReadOnly(this, 'options', options || {})
  }

  perform(method: string, params: any): Promise<any> {
    return poll(() => {
      return this.provider.perform(method, params).then(
        (result) => {
          return result
        },
        (_error) => {
          return undefined
        },
      )
    }, this.options)
  }
}

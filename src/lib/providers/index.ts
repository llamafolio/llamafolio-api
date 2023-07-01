import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { evmClient } from '@lib/providers/viem'
import type { PublicClient } from 'viem'

export const providers: { [chain in Chain]: PublicClient } = Object.assign({})

for (const chain of chains) {
  const provider = evmClient(chain, {
    protocol: 'http',
    options: {
      // default
      pollingInterval: 4_000,
      batch: { multicall: { batchSize: 1_024, wait: 16 } },
    },
    httpTransportConfig: chain.httpTransportConfig,
  })
  providers[chain.id] = provider
}

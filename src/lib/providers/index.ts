import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import { evmClient } from '@lib/providers/viem'
import type { PublicClient } from 'viem'

export const providers: { [chain in Chain]: PublicClient } = Object.assign({})

for (const chain of chains) {
  const provider = evmClient(chain)
  providers[chain.id] = provider
}

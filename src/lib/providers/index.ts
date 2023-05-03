import { setProvider } from '@defillama/sdk/build/general'
import environment from '@environment'
import type { Chain } from '@lib/chains'
import { chains } from '@lib/chains'
import type { ethers } from 'ethers'

import { createProvider } from './provider'

const { CUSTOM_PROVIDER } = environment

if (CUSTOM_PROVIDER) {
  console.log('Custom provider', CUSTOM_PROVIDER)
}

export const providers: { [chain in Chain]: ethers.providers.BaseProvider } = Object.assign({})

// update providers
for (const chain of chains) {
  const provider = createProvider(chain)

  providers[chain.id] = provider
  // update defillama sdk providers (used by calls and multicalls)
  setProvider(chain.id, provider)
}

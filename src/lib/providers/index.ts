import { setProvider } from '@defillama/sdk/build/general'
import { CUSTOM_PROVIDER } from '@env'
import { Chain, chains } from '@lib/chains'
import { ethers } from 'ethers'

import { createProvider } from './provider'

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

import { providers } from '@lib/providers'

export function fetchENSName(address: string) {
  const provider = providers.ethereum

  return provider.lookupAddress(address)
}

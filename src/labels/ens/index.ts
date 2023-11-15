import { providers } from '@lib/providers'

export function fetchENSName(address: `0x${string}`) {
  const provider = providers.ethereum

  return provider.getEnsName({ address })
}

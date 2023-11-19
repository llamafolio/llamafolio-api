import { chainById } from '@lib/chains'

export function fetchENSName(address: `0x${string}`) {
  const client = chainById.ethereum.client

  return client.getEnsName({ address })
}

import { getRPCClient } from '@lib/chains'

export function fetchENSName(address: `0x${string}`) {
  return getRPCClient({ chain: 'ethereum' }).getEnsName({ address })
}

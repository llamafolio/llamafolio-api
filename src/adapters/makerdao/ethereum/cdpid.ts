import type { BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  getCdpsAsc: {
    constant: true,
    inputs: [
      { internalType: 'address', name: 'manager', type: 'address' },
      { internalType: 'address', name: 'guy', type: 'address' },
    ],
    name: 'getCdpsAsc',
    outputs: [
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' },
      { internalType: 'address[]', name: 'urns', type: 'address[]' },
      { internalType: 'bytes32[]', name: 'ilks', type: 'bytes32[]' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface cdpid extends Contract {
  readonly ids: bigint[]
  readonly urns: `0x${string}`[]
  readonly ilks: `0x${string}`[]
}

export async function getCdpidFromProxiesAddresses(
  ctx: BalancesContext,
  cdps: Contract,
  manager: Contract,
  proxies: Contract[],
): Promise<cdpid[]> {
  const userCdpids: cdpid[] = []

  // Maker uses cdpid to map an id with user's addresses
  const cdpidAddressesRes = await multicall({
    ctx,
    calls: proxies.map((proxy) => ({ target: cdps.address, params: [manager.address, proxy.address] } as const)),
    abi: abi.getCdpsAsc,
  })

  for (let proxyIdx = 0; proxyIdx < proxies.length; proxyIdx++) {
    const cdpidAddressRes = cdpidAddressesRes[proxyIdx]
    if (!cdpidAddressRes.success) {
      continue
    }

    const [ids, urns, ilks] = cdpidAddressRes.output

    userCdpids.push({
      ...proxies[proxyIdx],
      ids: [...ids],
      urns: [...urns],
      ilks: [...ilks],
    })
  }

  return userCdpids
}

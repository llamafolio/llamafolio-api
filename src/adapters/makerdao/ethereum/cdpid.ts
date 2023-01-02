import { BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export interface cdpid extends Contract {
  ids: string[]
  urns: string[]
  ilks: string[]
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
    calls: proxies.map((proxy) => ({
      target: cdps.address,
      params: [manager.address, proxy.address],
    })),
    abi: abi.getCdpsAsc,
  })

  for (let proxyIdx = 0; proxyIdx < proxies.length; proxyIdx++) {
    const cdpidAddressRes = cdpidAddressesRes[proxyIdx]
    if (!isSuccess(cdpidAddressRes)) {
      continue
    }

    userCdpids.push({
      ...proxies[proxyIdx],
      ids: cdpidAddressRes.output.ids,
      urns: cdpidAddressRes.output.urns,
      ilks: cdpidAddressRes.output.ilks,
    })
  }

  return userCdpids
}

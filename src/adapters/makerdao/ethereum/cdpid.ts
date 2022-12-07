import { Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'

import { Proxy } from './proxies'

export interface cdpid extends Contract {
  ids: string[]
  urns: string[]
  ilks: string[]
}

export async function getCdpidFromProxiesAddresses(
  chain: Chain,
  cdps: Contract,
  manager: Contract,
  proxies: Proxy,
): Promise<cdpid[]> {
  const userCdpids: cdpid[] = []

  const makerProxies = proxies.maker
  const instadAppProxies = proxies.instadApp

  /**
   *    Maker uses cdpid to map an id with user's addresses
   */

  const [getMakerCdpidAddresses, getInstadAppCdpidAddresses] = await Promise.all([
    multicall({
      chain,
      calls: makerProxies.map((proxy) => ({
        target: cdps.address,
        params: [manager.address, proxy],
      })),
      abi: {
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
    }),

    multicall({
      chain,
      calls: instadAppProxies.map((proxy) => ({
        target: cdps.address,
        params: [manager.address, proxy],
      })),
      abi: {
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
    }),
  ])

  const makerCdpidAddresses = getMakerCdpidAddresses
    .filter((res) => res.success)
    .map((res) => ({ proxy: res.input.params[1], output: res.output }))

  const instadAppCdpidAddresses = getInstadAppCdpidAddresses
    .filter((res) => res.success)
    .map((res) => ({ proxy: res.input.params[1], output: res.output }))

  for (const makerCdpid of makerCdpidAddresses) {
    if (makerCdpid.output.ids.length > 0)
      userCdpids.push({
        chain,
        address: makerCdpid.proxy,
        proxy: 'Maker Proxy',
        ids: makerCdpid.output.ids,
        urns: makerCdpid.output.urns,
        ilks: makerCdpid.output.ilks,
      })
  }

  for (const instadAppCdpid of instadAppCdpidAddresses) {
    if (instadAppCdpid.output.ids.length > 0)
      userCdpids.push({
        chain,
        address: instadAppCdpid.proxy,
        proxy: 'InstadApp Proxy',
        ids: instadAppCdpid.output.ids,
        urns: instadAppCdpid.output.urns,
        ilks: instadAppCdpid.output.ilks,
      })
  }

  return userCdpids
}

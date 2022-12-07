import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { ethers } from 'ethers'

export interface Proxy {
  maker: string[]
  instadApp: string[]
}

export async function getProxiesContractsAddresses(
  ctx: BaseContext,
  chain: Chain,
  proxiesContracts: Contract[],
): Promise<Proxy> {
  const proxiesAddresses: Proxy = { maker: [], instadApp: [] }

  /**
   *  Maker allows 2 kinds of proxies: Maker and InstadApp
   */

  const Maker = proxiesContracts[0]
  const InstadApp = proxiesContracts[1]

  /**
   *    Check if user's address uses Maker proxies
   */

  const getProxiesAddressesFromMaker = await call({
    chain,
    target: Maker.address,
    params: [ctx.address],
    abi: {
      constant: true,
      inputs: [{ name: '', type: 'address' }],
      name: 'proxies',
      outputs: [{ name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  proxiesAddresses.maker.push(getProxiesAddressesFromMaker.output)

  /**
   *    Check if user's address uses InstadApp proxies
   */

  const getUserLinkCountFromInstadApp = await call({
    chain,
    target: InstadApp.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'userLink',
      outputs: [
        { internalType: 'uint64', name: 'first', type: 'uint64' },
        { internalType: 'uint64', name: 'last', type: 'uint64' },
        { internalType: 'uint64', name: 'count', type: 'uint64' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const instadAppIDProxies: string[] = []
  const userLinkCount = getUserLinkCountFromInstadApp.output.count
  const userLinkFirst = getUserLinkCountFromInstadApp.output.first

  instadAppIDProxies.push(userLinkFirst)

  for (let i = 1; i < userLinkCount; i++) {
    const userLinksRes = await call({
      chain,
      target: InstadApp.address,
      // Previous value gives access to the next one Id
      params: [ctx.address, instadAppIDProxies[instadAppIDProxies.length - 1]],
      abi: {
        inputs: [
          { internalType: 'address', name: '', type: 'address' },
          { internalType: 'uint64', name: '', type: 'uint64' },
        ],
        name: 'userList',
        outputs: [
          { internalType: 'uint64', name: 'prev', type: 'uint64' },
          { internalType: 'uint64', name: 'next', type: 'uint64' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    })

    instadAppIDProxies.push(userLinksRes.output.next)
  }

  const getInstadAppAddressesProxiesFromId = await multicall({
    chain,
    calls: instadAppIDProxies.map((id) => ({
      target: InstadApp.address,
      params: [id],
    })),
    abi: {
      inputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
      name: 'accountAddr',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const instadAppAddressesProxiesFromId = getInstadAppAddressesProxiesFromId
    .filter((res) => res.success)
    .map((res) => res.output)
    .filter((res) => res !== ethers.constants.AddressZero)

  proxiesAddresses.instadApp = instadAppAddressesProxiesFromId

  return proxiesAddresses
}

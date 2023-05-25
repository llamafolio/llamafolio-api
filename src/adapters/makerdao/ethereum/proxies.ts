import type { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'

const abi = {
  userLink: {
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
  userList: {
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
  accountAddr: {
    inputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    name: 'accountAddr',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  proxies: {
    constant: true,
    inputs: [{ name: '', type: 'address' }],
    name: 'proxies',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getInstaDappContracts(ctx: BalancesContext, instaList: Contract): Promise<Contract[]> {
  const getUserLinkCountFromInstadApp = await call({
    ctx,
    target: instaList.address,
    params: [ctx.address],
    abi: abi.userLink,
  })

  const ids: number[] = []
  const userLinkCount = parseInt(getUserLinkCountFromInstadApp.output.count)
  const userLinkFirst = parseInt(getUserLinkCountFromInstadApp.output.first)

  ids.push(userLinkFirst)

  for (let i = 1; i < userLinkCount; i++) {
    const userLinksRes = await call({
      ctx,
      target: instaList.address,
      // Previous value gives access to the next one Id
      params: [ctx.address, ids[ids.length - 1]],
      abi: abi.userList,
    })

    ids.push(userLinksRes.output.next)
  }

  const getInstadAppAddressesProxiesFromId = await multicall({
    ctx,
    calls: ids.map((id) => ({
      target: instaList.address,
      params: [id],
    })),
    abi: abi.accountAddr,
  })

  const instadAppAddressesProxiesFromId: string[] = getInstadAppAddressesProxiesFromId
    .filter((res) => res.success)
    .map((res) => res.output)
    .filter((res) => res !== ADDRESS_ZERO)

  return instadAppAddressesProxiesFromId.map((address) => ({
    chain: ctx.chain,
    address,
    proxy: 'InstaDapp',
  }))
}

export async function getMakerContracts(ctx: BalancesContext, proxyRegistry: Contract): Promise<Contract[]> {
  // Check if user's address uses Maker proxies
  const proxiesRes = await call({
    ctx,
    target: proxyRegistry.address,
    params: [ctx.address],
    abi: abi.proxies,
  })

  return [proxiesRes.output]
    .filter((res) => res !== ADDRESS_ZERO)
    .map((address) => ({
      chain: ctx.chain,
      address,
    }))
}

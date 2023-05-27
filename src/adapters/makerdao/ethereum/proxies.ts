import type { BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
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
} as const

export async function getInstaDappContracts(ctx: BalancesContext, instaList: Contract): Promise<Contract[]> {
  const userLink = await call({
    ctx,
    target: instaList.address,
    params: [ctx.address],
    abi: abi.userLink,
  })
  const [first, _last, count] = userLink

  const ids: bigint[] = []
  const userLinkCount = Number(count)

  ids.push(first)

  for (let i = 1; i < userLinkCount; i++) {
    const userLinks = await call({
      ctx,
      target: instaList.address,
      // Previous value gives access to the next one Id
      params: [ctx.address, ids[ids.length - 1]],
      abi: abi.userList,
    })

    const [_prev, next] = userLinks

    ids.push(next)
  }

  const getInstadAppAddressesProxiesFromId = await multicall({
    ctx,
    calls: ids.map((id) => ({ target: instaList.address, params: [id] } as const)),
    abi: abi.accountAddr,
  })

  const instadAppAddressesProxiesFromId = mapSuccessFilter(getInstadAppAddressesProxiesFromId, (res) =>
    res.output !== ADDRESS_ZERO ? res.output : null,
  )

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

  return [proxiesRes].filter((res) => res !== ADDRESS_ZERO).map((address) => ({ chain: ctx.chain, address }))
}

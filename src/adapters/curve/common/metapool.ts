import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { ethers } from 'ethers'

import { Registry } from './registries'

const abi = {
  pool_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_count',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 2138,
  },
  pool_list: {
    stateMutability: 'view',
    type: 'function',
    name: 'pool_list',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2217,
  },
  get_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 12102,
  },
  get_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2473,
  },
}

export async function getUnderlyingsFromMetapool(ctx: BaseContext, registries: Partial<Record<Registry, string>>) {
  const contracts: Contract[] = []

  const poolLengthRes = await call({ ctx, target: registries.stableSwap!, params: [], abi: abi.pool_count })

  const poolCalls: Call[] = range(0, poolLengthRes.output).map((i) => ({
    target: registries.stableSwap!,
    params: [i],
  }))

  const poolListsRes = await multicall({ ctx, calls: poolCalls, abi: abi.pool_list })

  const poolLists = poolListsRes.filter(isSuccess).map((res) => res.output)

  const calls: Call[] = poolLists.map((res) => ({
    target: registries.stableSwap!,
    params: [res],
  }))

  const [lpTokensRes, coinsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.get_lp_token }),
    multicall({ ctx, calls, abi: abi.get_coins }),
  ])

  for (let idx = 0; idx < poolLists.length; idx++) {
    const lpTokens = lpTokensRes[idx]
    const coins = coinsRes[idx]
    const poolList = poolLists[idx]

    if (!isSuccess(lpTokens) || !isSuccess(coins)) {
      continue
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: lpTokens.output,
      pool: poolList,
      underlyings: coinsRes[idx].output
        .map((address: string) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address: string) => address !== ethers.constants.AddressZero)
        // replace ETH alias
        .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
    }
    contracts.push(contract)
  }

  console.log(contracts)

  return contracts
}

import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  want: {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pid: {
    inputs: [],
    name: 'pid',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  masterChef: {
    inputs: [],
    name: 'masterChef',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const API_URL = 'https://fi-api.woo.org/yield?network='

export async function getWoofiContracts(ctx: BaseContext) {
  const chain = ctx.chain === 'avalanche' ? 'avax' : ctx.chain

  const response = await fetch(`${API_URL}${chain}`)
  const datas: any = await response.json()

  const pools: Contract[] = Object.entries(datas.data.auto_compounding).map(([address, data]: [any, any]) => ({
    chain: ctx.chain,
    address,
    name: data.source,
    decimals: data.decimals,
    symbol: `woo-${data.symbol}`,
  }))

  return getWoofiUnderlyings(ctx, pools)
}

const getWoofiUnderlyings = async (ctx: BaseContext, pools: Contract[]) => {
  const [underlyingsRes, masterChefsRes, pidsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.want,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.masterChef,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.pid,
    }),
  ])

  return pools
    .map((pool, idx) => {
      const underlyingRes = underlyingsRes[idx]
      if (!underlyingRes.success) {
        return null
      }

      const masterchef = masterChefsRes[idx].success ? masterChefsRes[idx].output : undefined
      const pid = pidsRes[idx].success ? pidsRes[idx].output : undefined

      return { ...pool, underlyings: [underlyingRes.output], masterchef, pid }
    })
    .filter(isNotNullish)
}

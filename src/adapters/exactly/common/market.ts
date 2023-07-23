import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  allMarkets: {
    inputs: [],
    name: 'allMarkets',
    outputs: [{ internalType: 'contract Market[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getExactlyMarkets(ctx: BaseContext, lendingPool: Contract): Promise<Contract[]> {
  const marketsRes = await call({ ctx, target: lendingPool.address, abi: abi.allMarkets })

  const assetsRes = await multicall({
    ctx,
    calls: marketsRes.map((market) => ({ target: market })),
    abi: abi.asset,
  })

  return mapSuccessFilter(assetsRes, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    token: res.output,
    lendingPool,
  }))
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  shares: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'shares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  sharesToUnderlying: {
    inputs: [{ internalType: 'uint256', name: 'amountShares', type: 'uint256' }],
    name: 'sharesToUnderlying',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEigenlayerBalances(ctx: BalancesContext, poolManager: Contract): Promise<Balance[]> {
  const pools = poolManager.underlyings as Contract[]

  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: abi.shares,
  })

  const fmtBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(userBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.sharesToUnderlying,
  })

  return mapSuccessFilter(fmtBalances, (res, index) => ({
    ...pools[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }))
}

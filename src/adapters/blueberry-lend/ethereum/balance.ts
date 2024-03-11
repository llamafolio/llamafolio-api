import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  balanceOf: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBlueBerryBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const shareBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  return mapSuccessFilter(shareBalances, (res, index) => ({
    ...(pools[index] as Balance),
    amount: res.output,
    decimals: 10,
    category: 'farm',
  }))
}

export async function getBlueBerryFarmBalances(
  ctx: BalancesContext,
  farmer: Contract,
  pools: Contract[],
): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: farmer.address, params: [ctx.address, pool.address] }) as const),
    abi: abi.balanceOf,
  })

  return mapSuccessFilter(userBalances, (res, index) => ({
    ...(pools[index] as Balance),
    amount: res.output,
    decimals: 10,
    category: 'farm',
  }))
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  totalLiquidity: {
    inputs: [],
    name: 'totalLiquidity',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStargateLPBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address, params: [ctx.address] }))

  const [balancesOfsRes, totalLiquidities, totalSupplies] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.totalLiquidity }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balancesOfsRes[poolIdx]
    const totalLiquidity = totalLiquidities[poolIdx]
    const totalSupply = totalSupplies[poolIdx]

    if (
      !underlyings ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(totalLiquidity) ||
      !isSuccess(totalSupply) ||
      isZero(totalSupply.output)
    ) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(balanceOfRes.output).mul(totalLiquidity.output).div(totalSupply.output),
      underlyings,
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}

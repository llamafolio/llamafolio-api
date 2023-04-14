import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getTotalAmounts: {
    inputs: [],
    name: 'getTotalAmounts',
    outputs: [
      { internalType: 'uint256', name: 'total0', type: 'uint256' },
      { internalType: 'uint256', name: 'total1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGammaFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfsRes, totalAmountsRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: abi.getTotalAmounts,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[poolIdx]
    const totalAmountRes = totalAmountsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (
      !underlyings ||
      !isSuccess(balancesOfRes) ||
      !isSuccess(totalAmountRes) ||
      !isSuccess(totalSupplyRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const tokens = underlyings.map((underlying, index) => {
      const amount = BigNumber.from(balancesOfRes.output)
        .mul(totalAmountRes.output[`total${index}`])
        .div(totalSupplyRes.output)
      return {
        ...underlying,
        amount,
      }
    })

    balances.push({
      ...pool,
      amount: BigNumber.from(balancesOfRes.output),
      underlyings: tokens,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}

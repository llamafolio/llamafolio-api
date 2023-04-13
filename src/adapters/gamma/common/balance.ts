import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
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

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyings = pool.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[idx]
    const totalAmountRes = totalAmountsRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]

    if (
      !underlyings ||
      !isSuccess(balancesOfRes) ||
      !isSuccess(totalAmountRes) ||
      !isSuccess(totalSupplyRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const balance: Balance = {
      ...pool,
      amount: BigNumber.from(balancesOfRes.output),
      underlyings,
      rewards: undefined,
      category: 'farm',
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = totalAmountRes.output[underlyingIdx]
      ;(underlying as Balance).amount =
        BigNumber.from(underlyingBalance).mul(balance.amount).div(totalSupplyRes.output) || BN_ZERO
    })

    balances.push(balance)
  }

  return balances
}

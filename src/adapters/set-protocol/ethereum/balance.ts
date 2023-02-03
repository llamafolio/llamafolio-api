import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

interface getSetProtocolPoolsBalances extends Balance {
  totalSupply: BigNumber
}

export async function getSetProtocolPoolsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const nonZeroBalances: getSetProtocolPoolsBalances[] = []

  const balancesOfCalls: Call[] = []
  const supplyCalls: Call[] = []

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    balancesOfCalls.push({ target: pool.address, params: [ctx.address] })
    supplyCalls.push({ target: pool.address, params: [] })
  }

  const [balancesOfRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls: balancesOfCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: supplyCalls, abi: erc20Abi.totalSupply }),
  ])

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const balanceOfRes = balancesOfRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]

    if (!isSuccess(balanceOfRes) || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      continue
    }

    const balance: getSetProtocolPoolsBalances = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      totalSupply: BigNumber.from(totalSupplyRes.output),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    }

    if (balance.amount.gt(0)) {
      nonZeroBalances.push(balance)
    }
  }

  for (const nonZeroBalance of nonZeroBalances) {
    const underlyings = nonZeroBalance.underlyings

    if (!underlyings) {
      continue
    }

    const underlyingsCalls: Call[] = []
    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlying = underlyings[underlyingIdx]
      underlyingsCalls.push({ target: underlying.address, params: [nonZeroBalance.address] })
    }

    const underlyingsPoolsBalances = await multicall({ ctx, calls: underlyingsCalls, abi: erc20Abi.balanceOf })

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlying: Contract = underlyings[underlyingIdx]
      const underlyingPoolBalance = underlyingsPoolsBalances[underlyingIdx]

      if (!isSuccess(underlyingPoolBalance)) {
        continue
      }

      underlying.amount = nonZeroBalance.amount.mul(underlyingPoolBalance.output).div(nonZeroBalance.totalSupply)
    }
  }

  return nonZeroBalances
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { getMasterChefLpToken } from '@lib/masterchef/masterchef'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import type { Pair } from '@lib/uniswap/v2/factory'
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
  pendingSushi: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGammaFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: erc20Abi.balanceOf,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[poolIdx]

    if (!underlyings || !isSuccess(balancesOfRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(balancesOfRes.output),
      underlyings,
      rewards: undefined,
      category: 'farm',
    })
  }

  return getGammaUnderlyings(ctx, balances)
}

const getGammaUnderlyings = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const [totalAmountsRes, totalSuppliesRes] = await Promise.all([
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
    const totalAmountRes = totalAmountsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !isSuccess(totalAmountRes) || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      continue
    }

    const tokens = underlyings.map((underlying, index) => {
      const amount = pool.amount.mul(totalAmountRes.output[`total${index}`]).div(totalSupplyRes.output)
      return {
        ...underlying,
        amount,
      }
    })

    balances.push({
      ...pool,
      amount: pool.amount,
      underlyings: tokens,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}

export async function getGammaMasterchefBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchefs: Contract[],
): Promise<Balance[]> {
  const balances: Balance[] = []
  const masterchefPools: Contract[] = []

  for (const masterchef of masterchefs) {
    masterchefPools.push(
      ...(await getMasterChefLpToken(ctx, pairs, masterchef)).map((res) => ({ ...res, provider: masterchef.address })),
    )
  }

  const poolsBalancesRes = await multicall({
    ctx,
    calls: masterchefPools.map((pool) => ({ target: pool.provider, params: [pool.pid, ctx.address] })),
    abi: abi.userInfo,
  })

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const masterchefPool = masterchefPools[userIdx]
    const poolBalanceRes = poolsBalancesRes[userIdx]

    if (!isSuccess(poolBalanceRes)) {
      continue
    }

    balances.push({
      ...masterchefPool,
      underlyings: masterchefPool.underlyings as Contract[],
      category: 'farm',
      amount: BigNumber.from(poolBalanceRes.output.amount),
      rewards: undefined,
    })
  }

  return getGammaUnderlyings(ctx, balances)
}

import type { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
} as const

interface getLybraFarmBalancesParams extends FarmBalance {
  provider: string
  pool?: `0x${string}`
  token?: `0x${string}`
}

const esLBR: Token = {
  chain: 'ethereum',
  address: '0x571042B7138ee957a96A6820FCe79c48fe2DA816',
  decimals: 18,
  symbol: 'esLBR',
}

export async function getLybraFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const curveBalances: getLybraFarmBalancesParams[] = []
  const swapBalances: getLybraFarmBalancesParams[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = farmers.map((farmer) => ({
    target: farmer.address,
    params: [ctx.address],
  }))

  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const underlyings = farmer.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[farmerIdx]
    const userPendingRewardRes = userPendingRewardsRes[farmerIdx]

    if (!underlyings || !userBalanceRes.success || !userPendingRewardRes.success) {
      continue
    }

    const balance: getLybraFarmBalancesParams = {
      ...farmer,
      amount: userBalanceRes.output,
      underlyings,
      rewards: [{ ...esLBR, amount: userPendingRewardRes.output }],
      provider: farmer.provider,
      category: 'farm',
    }

    if (balance.provider === 'curve') {
      curveBalances.push(balance)
    } else {
      swapBalances.push({ ...balance, address: balance.token! })
    }
  }

  const [fmtCurveBalances, fmtSwapBalances] = await Promise.all([
    getCurveUnderlying(ctx, curveBalances),
    getUnderlyingBalances(ctx, swapBalances),
  ])

  return [...fmtCurveBalances, ...fmtSwapBalances]
}

const getCurveUnderlying = async (ctx: BalancesContext, pools: getLybraFarmBalancesParams[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) =>
        pool.pool ? ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.pool] } as const) : null,
      ),
      abi: abi.get_underlying_balances,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.token! })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupplyRes.output || 0n
    })

    balances.push(pool)
  }

  return balances
}

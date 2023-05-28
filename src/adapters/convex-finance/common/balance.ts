import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  get_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 9818,
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_underlying_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct ConvexRewardPool.EarnedData[]',
        name: 'claimable',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

export async function getConvexAltChainsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const poolBalances: Balance[] = []
  const calls: Call<typeof erc20Abi.balanceOf>[] = pools.map((pool) => ({
    target: pool.crvRewards,
    params: [ctx.address],
  }))

  const [poolBalancesOfRes, pendingRewardsOfRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const pendingRewardOfRes = pendingRewardsOfRes[poolIdx]
    const poolBalanceOfRes = poolBalancesOfRes[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]

    if (!underlyings || !rewards || !pendingRewardOfRes.success || !poolBalanceOfRes.success) {
      continue
    }

    const fmtRewards = rewards.map((reward, rewardIdx) => ({
      ...reward,
      amount: pendingRewardOfRes.output[rewardIdx].amount,
    }))

    poolBalances.push({
      ...pool,
      amount: poolBalanceOfRes.output,
      underlyings,
      rewards: fmtRewards,
      category: 'stake',
    })
  }

  return getConvexUnderlyingsBalances(ctx, poolBalances)
}

const getConvexUnderlyingsBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const calls: Call<typeof abi.get_balances>[] = pools.map((pool) => ({ target: pool.registry, params: [pool.pool] }))
  const suppliesCalls: Call<typeof erc20Abi.totalSupply>[] = pools.map((pool) => ({ target: pool.lpToken }))

  const [totalSuppliesRes, balanceOfsRes, underlyingsBalancesRes, decimalsRes, underlyingsDecimalsRes] =
    await Promise.all([
      multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
      multicall({ ctx, calls, abi: abi.get_balances }),
      multicall({ ctx, calls, abi: abi.get_underlying_balances }),
      multicall({ ctx, calls, abi: abi.get_decimals }),
      multicall({ ctx, calls, abi: abi.get_underlying_decimals }),
    ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const uDecimalsRes = decimalsRes[poolIdx].success ? decimalsRes[poolIdx] : underlyingsDecimalsRes[poolIdx]
    const uBalancesRes = balanceOfsRes[poolIdx].success ? balanceOfsRes[poolIdx] : underlyingsBalancesRes[poolIdx]

    if (!uDecimalsRes.success || !totalSupplyRes.success || !uBalancesRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    underlyings.forEach((underlying: Contract, underlyingIdx: number) => {
      const underlyingBalance = uBalancesRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * pool.amount) / totalSupplyRes.output
    })

    balances.push({ ...pool, amount: pool.amount, underlyings, rewards: pool.rewards as Balance[], category: 'stake' })
  }

  return balances
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
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
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3787,
  },
  claimable_reward: {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_tokens',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3038676,
  },
  claimable_extra_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 20255,
  },
  reward_contract: {
    name: 'reward_contract',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2411,
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
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
} as const

type PoolBalance = Balance & {
  pool?: string
  lpToken?: string
  totalSupply?: bigint
}

export async function getPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  registry?: Contract,
  underlyingsAbi?: boolean,
): Promise<Balance[]> {
  const poolBalances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = []
  for (const pool of pools) {
    calls.push({ target: pool.address, params: [ctx.address] })
  }

  const poolsBalancesOfRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

  let poolIdx = 0
  for (let balanceIdx = 0; balanceIdx < pools.length; balanceIdx++) {
    const pool = pools[poolIdx] as Balance
    const poolBalanceOfRes = poolsBalancesOfRes[balanceIdx]

    if (!poolBalanceOfRes.success) {
      poolIdx++
      continue
    }

    poolBalances.push({
      ...pool,
      amount: poolBalanceOfRes.output,
      underlyings: pool.underlyings,
      rewards: pool.rewards,
    })

    poolIdx++
  }

  // There is no need to look for underlyings balances if pool balances is null
  const nonZeroPoolBalances = poolBalances.filter((res) => res.amount > 0n)

  return getUnderlyingsPoolsBalances(ctx, nonZeroPoolBalances, registry, underlyingsAbi)
}

export const getUnderlyingsPoolsBalances = async (
  ctx: BalancesContext,
  pools: PoolBalance[],
  registry?: Contract,
  underlyingsAbi?: boolean,
): Promise<Balance[]> => {
  const underlyingsBalancesInPools: Balance[] = []

  const suppliesCalls: Call<typeof erc20Abi.totalSupply>[] = []
  const optionAbiBalances = underlyingsAbi ? abi.get_underlying_balances : abi.get_balances
  const optionAbiDecimals = underlyingsAbi ? abi.get_underlying_decimals : abi.get_decimals
  const calls: Call<any>[] = []

  for (const pool of pools as Contract[]) {
    calls.push({ target: registry ? registry.address : pool.registry, params: [pool.pool] })
    suppliesCalls.push({ target: pool.lpToken })
  }

  const [totalSuppliesRes, underlyingsBalanceOfRes, underlyingsDecimalsRes] = await Promise.all([
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls, abi: optionAbiBalances }),
    multicall({ ctx, calls, abi: optionAbiDecimals }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!totalSupplyRes.success || totalSupplyRes.output === 0n) {
      // next pool
      balanceOfIdx += underlyings.length
      continue
    }

    const totalSupply = totalSupplyRes.output

    const poolBalance: PoolBalance = {
      ...pools[poolIdx],
      category: 'lp',
      underlyings: [],
      decimals: 18,
      totalSupply,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceOfRes = underlyingsBalanceOfRes[balanceOfIdx]
      const underlyingDecimalsRes = underlyingsDecimalsRes[balanceOfIdx]

      const underlyingsBalance =
        underlyingBalanceOfRes.success && underlyingBalanceOfRes.output[underlyingIdx] != undefined
          ? underlyingBalanceOfRes.output[underlyingIdx]
          : 0n

      const underlyingsDecimals =
        underlyingDecimalsRes.success && underlyingDecimalsRes.output[underlyingIdx] != undefined
          ? Number(underlyingDecimalsRes.output[underlyingIdx])
          : 18

      poolBalance.underlyings?.push({
        ...underlyings[underlyingIdx],
        decimals: underlyingsDecimals,
        amount: (underlyingsBalance * poolBalance.amount) / totalSupply,
      })
    }

    underlyingsBalancesInPools.push(poolBalance)
    balanceOfIdx++
  }

  return underlyingsBalancesInPools
}

export async function getGaugesBalances(
  ctx: BalancesContext,
  gauges: Contract[],
  registry?: Contract,
  underlyingsAbi?: boolean,
) {
  const uniqueRewards: Balance[] = []
  const nonUniqueRewards: Balance[] = []

  const gaugesBalancesRes = await getPoolsBalances(ctx, gauges, registry, underlyingsAbi)

  const calls: Call<typeof abi.claimable_reward>[] = []
  for (const gaugesBalance of gaugesBalancesRes) {
    gaugesBalance.category = 'farm'
    calls.push({ target: gaugesBalance.address, params: [ctx.address] })
  }

  const claimableRewards = await multicall({ ctx, calls, abi: abi.claimable_reward })

  const extraRewardsCalls: Call<typeof abi.claimable_extra_reward>[] = []
  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const gaugeBalance = gaugesBalancesRes[gaugeIdx]
    const rewards = gaugeBalance.rewards as Contract[]
    const claimableReward = claimableRewards[gaugeIdx]

    if (!rewards || !claimableReward.success) {
      continue
    }

    // rewards[0] is the common rewards for all pools: CRV
    rewards[0].amount = claimableReward.output

    if (rewards.length != 2) {
      uniqueRewards.push(gaugeBalance)
      continue
    }

    for (let rewardIdx = 1; rewardIdx < rewards.length; rewardIdx++) {
      const reward = rewards[rewardIdx]
      extraRewardsCalls.push({ target: (gaugeBalance as Contract).gauge, params: [ctx.address, reward.address] })
      nonUniqueRewards.push(gaugeBalance)
    }
  }

  const extraRewardsRes = await multicall({ ctx, calls: extraRewardsCalls, abi: abi.claimable_extra_reward })

  for (let idx = 0; idx < nonUniqueRewards.length; idx++) {
    const rewards = nonUniqueRewards[idx].rewards
    const extraRewardRes = extraRewardsRes[idx]

    if (!rewards || !extraRewardRes.success) {
      continue
    }

    rewards[1].amount = extraRewardRes.output
  }

  return [...uniqueRewards, ...nonUniqueRewards]
}

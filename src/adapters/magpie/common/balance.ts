import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  stakingInfo: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'stakingInfo',
    outputs: [
      { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'availableAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingMGP', type: 'uint256' },
      { internalType: 'address', name: 'bonusTokenAddress', type: 'address' },
      { internalType: 'string', name: 'bonusTokenSymbol', type: 'string' },
      { internalType: 'uint256', name: 'pendingBonusToken', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  allPendingTokens: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'allPendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingMGP', type: 'uint256' },
      { internalType: 'address[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'pendingBonusRewards', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  allEarned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'allEarned',
    outputs: [{ internalType: 'uint256[]', name: 'pendingBonusRewards', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  balanceOf: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalStaked: {
    inputs: [],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMagpieBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(
        (pool) =>
          ({ target: masterchef.address, params: [pool.staker, ctx.address], enabled: pool.staker != null }) as const,
      ),
      abi: abi.stakingInfo,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) =>
          ({ target: masterchef.address, params: [pool.staker, ctx.address], enabled: pool.staker != null }) as const,
      ),
      abi: abi.allPendingTokens,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Contract[]
    const userBalanceRes = userBalancesRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]

    if (!underlyings || !rewards || !userBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    const fmtRewards: any[] = rewards
      // prevent duplicate MGP rewards
      .slice(1)
      .map((reward, rewardIdx) => {
        const [pendingMGP, _bonusTokenAddresses, _bonusTokenSymbols, pendingBonusRewards] = pendingRewardRes.output
        const mgpReward = { ...(rewards[0] as Contract), amount: pendingMGP }
        const bonusReward = {
          ...(reward as Contract),
          amount: pendingBonusRewards[rewardIdx],
        }
        return [mgpReward, bonusReward]
      })
      .flat()

    const [stakedAmount] = userBalanceRes.output

    balances.push({
      ...pool,
      amount: stakedAmount,
      underlyings,
      rewards: fmtRewards,
      category: 'farm',
    })
  }

  return balances
}

export async function getMGPBalance(ctx: BalancesContext, MGP: Contract): Promise<Balance> {
  const [userBalance, pendingRewards, totalStaked, totalSupply] = await Promise.all([
    call({ ctx, target: MGP.staker, params: [ctx.address], abi: abi.balanceOf }),
    call({ ctx, target: MGP.staker, params: [ctx.address], abi: abi.allEarned }),
    call({ ctx, target: MGP.staker, abi: abi.totalStaked }),
    call({ ctx, target: (MGP.underlyings?.[0] as Contract).address, params: [MGP.address], abi: abi.balanceOf }),
  ])

  const fmtRewards = MGP.rewards?.map((reward, idx) => {
    const rewardBalance = pendingRewards[idx]
    return { ...(reward as Contract), amount: rewardBalance }
  })

  const fmtUnderlying = {
    ...(MGP.underlyings?.[0] as Contract),
    amount: (userBalance * totalStaked) / totalSupply,
  }

  return {
    ...MGP,
    amount: userBalance,
    underlyings: [fmtUnderlying],
    rewards: fmtRewards,
    category: 'farm',
  }
}

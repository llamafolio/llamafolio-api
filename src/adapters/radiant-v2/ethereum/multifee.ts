import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { call } from '@lib/call'
import { sumBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  UNDERLYING_ASSET_ADDRESS: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct IFeeDistribution.RewardData[]',
        name: 'rewardsData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earnedBalances: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'earnedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlocked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
          { internalType: 'uint256', name: 'penalty', type: 'uint256' },
        ],
        internalType: 'struct EarnedBalance[]',
        name: 'earningsData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalances: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      { internalType: 'uint256', name: 'lockedWithMultiplier', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
          { internalType: 'uint256', name: 'multiplier', type: 'uint256' },
          { internalType: 'uint256', name: 'duration', type: 'uint256' },
        ],
        internalType: 'struct LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardConverter: {
    inputs: [],
    name: 'rewardConverter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  viewPendingRewards: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'viewPendingRewards',
    outputs: [
      { internalType: 'address[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const radiantToken: Token = {
  chain: 'ethereum',
  address: '0x137ddb47ee24eaa998a535ab00378d6bfa84f893',
  symbol: 'RDNT',
  decimals: 18,
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
}

export interface GetMultiFeeDistributionBalancesParams {
  lendingPool: Contract
  multiFeeDistribution: Contract
  stakingToken: Contract
}

export async function getMultiFeeDistributionContracts(
  ctx: BaseContext,
  multiFeeDistribution: Contract,
  stakingToken: Contract,
): Promise<Contract> {
  const claimableRewards = await call({
    ctx,
    target: multiFeeDistribution.address,
    // any addresses could return reward addresses
    params: [multiFeeDistribution.address],
    abi: abi.claimableRewards,
  })

  const underlyingsTokensRes = await multicall({
    ctx,
    calls: claimableRewards.map((reward) => ({ target: reward.token })),
    abi: abi.UNDERLYING_ASSET_ADDRESS,
  })

  return {
    ...stakingToken,
    address: multiFeeDistribution.address,
    token: stakingToken.address,
    rewards: mapSuccessFilter(underlyingsTokensRes, (token) => token.output),
  }
}

export async function getMultiFeeDistributionBalancesETH(
  ctx: BalancesContext,
  multiFeeDistributionContract: Contract,
  params: GetMultiFeeDistributionBalancesParams,
): Promise<Balance[] | undefined> {
  const vestBalances: Balance[] = []
  const lockBalances: IBalancerBalance[] = []

  const contract = multiFeeDistributionContract
  const rewards = contract.rewards as Contract[]
  const underlyings = contract.underlyings as Contract[]
  const token = params.stakingToken

  if (!rewards || !underlyings || !token) {
    return
  }

  const [lockedBalances, earnedBalances, rewardConverter] = await Promise.all([
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.earnedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, abi: abi.rewardConverter }),
  ])
  const [total, _unlockable, _locked, _lockedWithMultiplier, lockData] = lockedBalances
  const [_total, _unlocked, earningsData] = earnedBalances

  const pendingRewards = await call({
    ctx,
    target: rewardConverter,
    params: [ctx.address],
    abi: abi.viewPendingRewards,
  })
  const [_tokens, amts] = pendingRewards

  // Locker
  const sumLocked = sumBI((lockData || []).map((lockData) => lockData.amount))
  const expiredLocked = total - sumLocked

  lockBalances.push({
    chain: ctx.chain,
    address: token.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    poolId: token.poolId,
    underlyings,
    rewards: undefined,
    amount: expiredLocked,
    claimable: expiredLocked,
    category: 'lock',
  })

  for (let lockIdx = 0; lockIdx < lockData.length; lockIdx++) {
    const lockedBalance = lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    lockBalances.push({
      chain: ctx.chain,
      address: token.address,
      symbol: contract.symbol,
      decimals: contract.decimals,
      poolId: token.poolId,
      underlyings,
      rewards: undefined,
      amount,
      unlockAt: Number(unlockTime),
      claimable: 0n,
      category: 'lock',
    })
  }

  // Vester
  for (let vestIdx = 0; vestIdx < earningsData.length; vestIdx++) {
    const earnedBalance = earningsData[vestIdx]
    const { amount, unlockTime } = earnedBalance

    vestBalances.push({
      chain: ctx.chain,
      address: radiantToken.address,
      symbol: radiantToken.symbol,
      decimals: radiantToken.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount,
      unlockAt: Number(unlockTime),
      category: 'vest',
    })
  }

  for (let rewardIdx = 0; rewardIdx < rewards.length; rewardIdx++) {
    const reward = rewards[rewardIdx]
    const pendingReward = amts[rewardIdx]

    vestBalances.push({
      chain: ctx.chain,
      address: reward.address,
      symbol: reward.symbol,
      decimals: reward.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: pendingReward,
      category: 'reward',
    })
  }

  return [...vestBalances, ...(await getUnderlyingsBalancesFromBalancer(ctx, lockBalances, vault))]
}

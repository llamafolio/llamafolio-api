import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
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
  chain: 'arbitrum',
  address: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
  symbol: 'RDNT',
  decimals: 18,
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

export async function getMultiFeeDistributionBalances(
  ctx: BalancesContext,
  multiFeeDistributionContract: Contract,
  params: GetMultiFeeDistributionBalancesParams,
): Promise<Balance[] | undefined> {
  const balances: Balance[] = []

  const contract = multiFeeDistributionContract
  const rewards = contract.rewards as Contract[]
  const underlyings = contract.underlyings as Contract[]

  if (!rewards || !underlyings) {
    return
  }

  const [lockedBalances, earnedBalances, rewardConverter, totalSupply, vaultBalances] = await Promise.all([
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.earnedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, abi: abi.rewardConverter }),
    call({ ctx, target: contract.token!, abi: erc20Abi.totalSupply }),
    call({ ctx, target: contract.vault, params: [contract.poolId], abi: abi.getPoolTokens }),
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

  const underlyingBalances = (underlyings: Contract[], vaultBalances: any, amount: bigint, supply: bigint) => {
    return underlyings.map((underlying: Contract, index: number) => ({
      ...underlying,
      amount: (vaultBalances[index] * amount) / supply,
    }))
  }

  // Locker
  const sumLocked = sumBI((lockData || []).map((lockData) => lockData.amount))
  const expiredLocked = total - sumLocked

  balances.push({
    chain: ctx.chain,
    address: contract.token!,
    symbol: contract.symbol,
    decimals: contract.decimals,
    underlyings: undefined,
    rewards: undefined,
    amount: expiredLocked,
    claimable: expiredLocked,
    category: 'lock',
  })

  for (let lockIdx = 0; lockIdx < lockData.length; lockIdx++) {
    const lockedBalance = lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    balances.push({
      chain: ctx.chain,
      address: contract.address,
      symbol: contract.symbol,
      decimals: contract.decimals,
      underlyings: underlyingBalances(underlyings, vaultBalances[1], amount, totalSupply),
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

    balances.push({
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

    balances.push({
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

  return balances
}

import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

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
  const { output: claimableRewards } = await call({
    ctx,
    target: multiFeeDistribution.address,
    // any addresses could return reward addresses
    params: [multiFeeDistribution.address],
    abi: abi.claimableRewards,
  })

  const underlyingsTokensRes = await multicall({
    ctx,
    calls: claimableRewards.map((reward: { token: string; amount: string }) => ({ target: reward.token })),
    abi: abi.UNDERLYING_ASSET_ADDRESS,
  })

  return {
    ...stakingToken,
    address: multiFeeDistribution.address,
    token: stakingToken.address,
    rewards: underlyingsTokensRes.filter(isSuccess).map((token) => token.output),
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

  const [
    { output: lockedBalances },
    { output: earnedBalances },
    { output: rewardConverter },
    { output: totalSupply },
    { output: vaultBalances },
  ] = await Promise.all([
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.earnedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, abi: abi.rewardConverter }),
    call({ ctx, target: contract.token as string, abi: erc20Abi.totalSupply }),
    call({ ctx, target: contract.vault, params: [contract.poolId], abi: abi.getPoolTokens }),
  ])

  const { output: pendingRewards } = await call({
    ctx,
    target: rewardConverter,
    params: [ctx.address],
    abi: abi.viewPendingRewards,
  })

  const underlyingBalances = (underlyings: Contract[], vaultBalances: any, amount: BigNumber, supply: BigNumber) => {
    return underlyings.map((underlying: Contract, index: number) => ({
      ...underlying,
      amount: BigNumber.from(vaultBalances.balances[index]).mul(amount).div(supply),
      underlyings: undefined,
    }))
  }

  for (let lockIdx = 0; lockIdx < lockedBalances.lockData.length; lockIdx++) {
    const lockedBalance = lockedBalances.lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    balances.push({
      chain: ctx.chain,
      address: contract.address,
      symbol: contract.symbol,
      decimals: contract.decimals,
      underlyings: underlyingBalances(underlyings, vaultBalances, BigNumber.from(amount), BigNumber.from(totalSupply)),
      rewards: undefined,
      amount: BigNumber.from(amount),
      unlockAt: unlockTime,
      claimable: unlockTime < Date.now() ? BigNumber.from(lockedBalances.unlockable) : BN_ZERO,
      category: 'lock',
    })
  }

  for (let vestIdx = 0; vestIdx < earnedBalances.earningsData.length; vestIdx++) {
    const earnedBalance = earnedBalances.earningsData[vestIdx]
    const { amount, unlockTime } = earnedBalance

    balances.push({
      chain: ctx.chain,
      address: radiantToken.address,
      symbol: radiantToken.symbol,
      decimals: radiantToken.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: BigNumber.from(amount),
      unlockAt: unlockTime,
      category: 'vest',
    })
  }

  for (let rewardIdx = 0; rewardIdx < rewards.length; rewardIdx++) {
    const reward = rewards[rewardIdx]
    const pendingReward = pendingRewards.amts[rewardIdx]

    balances.push({
      chain: ctx.chain,
      address: reward.address,
      symbol: reward.symbol,
      decimals: reward.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: BigNumber.from(pendingReward),
      category: 'reward',
    })
  }

  return balances
}

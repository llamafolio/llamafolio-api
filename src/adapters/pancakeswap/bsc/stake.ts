import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers/lib/ethers'

const abi = {
  stakedToken: {
    inputs: [],
    name: 'stakedToken',
    outputs: [{ internalType: 'contract IERC20Metadata', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20Metadata', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDepositedTime', type: 'uint256' },
      { internalType: 'uint256', name: 'cakeAtLastUserAction', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUserActionTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockStartTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockEndTime', type: 'uint256' },
      { internalType: 'uint256', name: 'userBoostedShare', type: 'uint256' },
      { internalType: 'bool', name: 'locked', type: 'bool' },
      { internalType: 'uint256', name: 'lockedAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const cake: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}

export async function getStakerBalances(ctx: BalancesContext, staker: Contract) {
  const balances: Balance[] = []

  const [userBalanceOfRes, pendingRewardsRes] = await Promise.all([
    call({ ctx, target: staker.address, params: ctx.address, abi: abi.userInfo }),
    call({ ctx, target: staker.address, params: ctx.address, abi: abi.pendingReward }),
  ])

  balances.push({
    ...staker,
    decimals: cake.decimals,
    symbol: cake.symbol,
    underlyings: [cake],
    amount: BigNumber.from(userBalanceOfRes.output.amount),
    rewards: [{ ...(staker.rewards?.[0] as Contract), amount: BigNumber.from(pendingRewardsRes.output) }],
    category: 'stake',
  })

  return balances
}

export async function getStakerCake(ctx: BalancesContext, staker: Contract) {
  const balance: Balance[] = []

  const balanceOfRes = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfos })
  const balanceOf = BigNumber.from(balanceOfRes.output.lockedAmount)

  balance.push({
    ...staker,
    amount: balanceOf,
    decimals: cake.decimals,
    symbol: cake.symbol,
    underlyings: [cake],
    // Rewards set as BN_ZERO until we find the way to get auto-compound formula
    rewards: [{ ...cake, amount: BN_ZERO }],
    category: 'stake',
  })

  return balance
}

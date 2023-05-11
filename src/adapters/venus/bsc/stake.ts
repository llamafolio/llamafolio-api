import type { BalancesContext, Contract, StakeBalance } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  userInfo: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  pendingXVS: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingXVS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    constant: true,
    inputs: [
      { internalType: 'address', name: '_rewardToken', type: 'address' },
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getUserInfo: {
    constant: true,
    inputs: [
      { internalType: 'address', name: '_rewardToken', type: 'address' },
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getUserInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'pendingWithdrawals', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const XVS: Token = {
  chain: 'bsc',
  address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
  decimals: 18,
  symbol: 'XVS',
}

export async function getVAIStakeBalance(ctx: BalancesContext, staker: Contract): Promise<StakeBalance> {
  const [{ output: stakeBalance }, { output: pendingXVS }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.pendingXVS }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(stakeBalance.amount),
    underlyings: undefined,
    rewards: [{ ...XVS, amount: pendingXVS }],
    category: 'stake',
  }
}

export async function getXVSStakeBalance(ctx: BalancesContext, staker: Contract): Promise<StakeBalance> {
  const [{ output: stakeBalance }, { output: pendingXVS }] = await Promise.all([
    call({ ctx, target: staker.address, params: [XVS.address, 0, ctx.address], abi: abi.getUserInfo }),
    call({ ctx, target: staker.address, params: [XVS.address, 0, ctx.address], abi: abi.pendingReward }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(stakeBalance.amount),
    underlyings: undefined,
    rewards: [{ ...XVS, amount: BigNumber.from(pendingXVS) }],
    category: 'stake',
  }
}

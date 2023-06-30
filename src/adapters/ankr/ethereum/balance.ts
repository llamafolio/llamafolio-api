import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  getValidatorDelegation: {
    inputs: [
      {
        internalType: 'address',
        name: 'validator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'delegator',
        type: 'address',
      },
    ],
    name: 'getValidatorDelegation',
    outputs: [
      {
        internalType: 'uint256',
        name: 'delegatedAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint64',
        name: 'atEpoch',
        type: 'uint64',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getStakingRewards: {
    inputs: [
      {
        internalType: 'address',
        name: 'validator',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'delegator',
        type: 'address',
      },
    ],
    name: 'getStakingRewards',
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
  sharesToBonds: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'sharesToBonds',
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
  balanceWithRewardsOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'balanceWithRewardsOf',
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
  claimableAETHFRewardOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
    ],
    name: 'claimableAETHFRewardOf',
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
  claimableAETHRewardOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'staker',
        type: 'address',
      },
    ],
    name: 'claimableAETHRewardOf',
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

const ANKR: Token = {
  chain: 'ethereum',
  address: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
  decimals: 18,
  symbol: 'ANKR',
}

export async function getAnkrStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const VALIDATOR = '0x0a9bCF1526D39e0CB189215d0380D0b0Fc85B645'

  const [[delegatedAmount, _atEpoch], userPendingRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [VALIDATOR, ctx.address], abi: abi.getValidatorDelegation }),
    call({ ctx, target: staker.address, params: [VALIDATOR, ctx.address], abi: abi.getStakingRewards }),
  ])

  return {
    ...staker,
    amount: delegatedAmount,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: delegatedAmount }],
    rewards: [{ ...ANKR, amount: userPendingRewards }],
    category: 'stake',
  }
}

export async function getAnkrETHv2StakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const sharesToBonds = await call({ ctx, target: staker.address, params: [userBalance], abi: abi.sharesToBonds })

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: sharesToBonds }],
    rewards: undefined,
    category: 'stake',
  }
}

export async function getAnkrETHStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [useraETHBalance, userETHBalance] = await Promise.all([
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.claimableAETHFRewardOf,
    }),
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.claimableAETHRewardOf,
    }),
  ])

  return {
    ...staker,
    amount: useraETHBalance,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: userETHBalance }],
    rewards: undefined,
    category: 'stake',
  }
}

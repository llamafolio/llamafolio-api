import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  balanceOf: {
    constant: true,
    inputs: [
      {
        name: '_customerAddress',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  dividendsOf: {
    constant: true,
    inputs: [
      {
        name: '_customerAddress',
        type: 'address',
      },
    ],
    name: 'dividendsOf',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getUser: {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getUser',
    outputs: [
      {
        components: [
          {
            internalType: 'bool',
            name: 'exists',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'deposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'compound_deposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'current_balance',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'payouts',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'rewards',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'last_time',
            type: 'uint256',
          },
        ],
        internalType: 'struct StampedeUser',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  calculatePrice: {
    inputs: [],
    name: 'calculatePrice',
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

export async function getElephantStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, userRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] } as const)),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] } as const)),
      abi: abi.dividendsOf,
    }),
  ])

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const reward = staker.rewards?.[0] as Contract
    const userBalanceRes = userBalancesRes[stakeIdx]
    const userRewardRes = userRewardsRes[stakeIdx]

    if (!userBalanceRes.success) {
      continue
    }

    const fmtRewards = userRewardRes.success ? [{ ...reward, amount: userRewardRes.output }] : undefined

    balances.push({
      ...staker,
      amount: userBalanceRes.output,
      underlyings: undefined,
      rewards: fmtRewards,
      category: 'stake',
    })
  }

  return balances
}

export async function getElephantTrunkBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getUser })

  return {
    ...staker,
    amount: userBalance.current_balance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getElephantTrumpetBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalancesRes, exchangeRate] = await Promise.all([
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),
    call({
      ctx,
      target: staker.address,
      abi: abi.calculatePrice,
    }),
  ])

  const fmtAmount = (userBalancesRes * exchangeRate) / parseEther('1.0')

  return {
    ...staker,
    amount: fmtAmount,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

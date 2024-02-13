import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  lockedBalances: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
        ],
        internalType: 'struct FASTStaking.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
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
        internalType: 'struct FASTStaking.RewardData[]',
        name: '_rewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LIQD: Contract = {
  chain: 'arbitrum',
  address: '0x93c15cd7de26f07265f0272e0b831c5d7fab174f',
  decimals: 18,
  symbol: 'LIQD',
}

const WETH: Contract = {
  chain: 'arbitrum',
  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  decimals: 18,
  symbol: 'WETH',
}

export async function getLIQDLockBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const [[_, stakeBalance, ___, lockedBalances], pendingRewards] = await Promise.all([
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.lockedBalances,
    }),
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.claimableRewards,
    }),
  ])

  pendingRewards.forEach((res) => {
    const tokenAddress = res.token.toLowerCase()
    ;[LIQD, WETH].forEach((reward) => {
      if (reward.address.toLowerCase() === tokenAddress) {
        reward.amount = res.amount
      }
    })
  })

  const stake: Balance = {
    ...locker,
    amount: stakeBalance,
    underlyings: undefined,
    rewards: [LIQD, WETH] as Balance[],
    category: 'stake',
  }

  const lockBalances: Balance[] = lockedBalances.map((res) => {
    const now = Date.now() / 1000
    const { amount, unlockTime } = res
    const unlockAt = Number(unlockTime)

    return {
      ...locker,
      amount,
      unlockAt,
      claimable: now > unlockAt ? amount : 0n,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    }
  })

  return [stake, ...lockBalances]
}

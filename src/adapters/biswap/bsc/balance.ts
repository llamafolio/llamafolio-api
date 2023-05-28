import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingBSW: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingBSW',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userStakeInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDepositedTime', type: 'uint256' },
      { internalType: 'uint256', name: 'BswAtLastUserAction', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUserActionTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BSW: Token = {
  chain: 'bsc',
  address: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
  decimals: 18,
  symbol: 'BSW',
}

export async function getUniqueUnderlyingsMasterchefBalances(ctx: BalancesContext, masterchef: Contract) {
  const balances: Balance[] = []

  const [userInfo, pendingRewards] = await Promise.all([
    call({ ctx, target: masterchef.address, params: [0n, ctx.address], abi: abi.userInfo }),
    call({ ctx, target: masterchef.address, params: [0n, ctx.address], abi: abi.pendingBSW }),
  ])
  const [amount, _rewardDebt] = userInfo

  balances.push({
    chain: ctx.chain,
    address: BSW.address,
    decimals: BSW.decimals,
    symbol: 'BSW-LP',
    amount,
    underlyings: [BSW],
    rewards: [{ ...BSW, amount: pendingRewards }],
    category: 'farm',
  })

  return balances
}

export async function getStakeBalances(ctx: BalancesContext, stakers: Contract[]) {
  const balances: Balance[] = []

  const balanceOfCalls: Call<typeof abi.userStakeInfo>[] = stakers.map((staker) => ({
    target: staker.address,
    params: [ctx.address],
  }))
  const pendingRewardsCalls: Call<typeof abi.getPricePerFullShare>[] = stakers.map((staker) => ({
    target: staker.address,
  }))

  const [balanceOfRes, getMultiplierRewards] = await Promise.all([
    multicall({ ctx, calls: balanceOfCalls, abi: abi.userStakeInfo }),
    multicall({ ctx, calls: pendingRewardsCalls, abi: abi.getPricePerFullShare }),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const amount = balanceOfRes[stakerIdx].output?.[0] || 0n
    const multiplier = getMultiplierRewards[stakerIdx].output || 0n

    const autoCompoundBalances = (amount * multiplier) / parseEther('1.0')

    balances.push({
      chain: ctx.chain,
      address: staker.address,
      decimals: BSW.decimals,
      symbol: BSW.symbol,
      amount: autoCompoundBalances,
      underlyings: [BSW],
      category: 'stake',
    })
  }

  return balances
}

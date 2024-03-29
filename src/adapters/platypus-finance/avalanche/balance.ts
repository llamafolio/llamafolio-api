import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'uint128', name: 'factor', type: 'uint128' },
      { internalType: 'uint128', name: 'rewardDebt', type: 'uint128' },
      { internalType: 'uint128', name: 'claimablePtp', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingPtp', type: 'uint256' },
      { internalType: 'contract IERC20[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'pendingBonusTokens', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedPositions: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lockedPositions',
    outputs: [
      { internalType: 'uint128', name: 'initialLockTime', type: 'uint128' },
      { internalType: 'uint128', name: 'unlockTime', type: 'uint128' },
      { internalType: 'uint128', name: 'ptpLocked', type: 'uint128' },
      { internalType: 'uint128', name: 'vePtpAmount', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getStakedPtp: {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'getStakedPtp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableWithXp: {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'claimableWithXp',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'xp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PTP: Token = {
  chain: 'avalanche',
  address: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
  decimals: 18,
  symbol: 'PTP',
}

export async function getFarmBalances(ctx: BalancesContext, pools: Contract[], contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = []
  for (const pool of pools) {
    calls.push({ target: contract.address, params: [pool.pid, ctx.address] })
  }

  const [userInfosRes, userPendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingTokens }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const rewards = pools[poolIdx].rewards as Contract[]
    const userInfo = userInfosRes[poolIdx]
    const userPendingReward = userPendingRewardsRes[poolIdx]

    if (!rewards || !userInfo.success || !userPendingReward.success) {
      continue
    }

    const [amount] = userInfo.output
    const [pendingPtp, _bonusTokenAddresses, _bonusTokenSymbols, pendingBonusTokens] = userPendingReward.output

    const balance: Balance = {
      ...pool,
      amount: amount,
      underlyings: pool.underlyings as Contract[],
      rewards: [{ ...rewards[0], amount: pendingPtp }],
      category: 'farm',
    }

    if (rewards.length > 1) {
      balance.rewards?.push({ ...rewards[1], amount: pendingBonusTokens[0] })
    }

    balances.push(balance)
  }

  return balances
}

export async function getLockerBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const lockedPositionsRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.lockedPositions,
  })
  const [_initialLockTime, unlockTime, ptpLocked, _vePtpAmount] = lockedPositionsRes

  return {
    ...contract,
    amount: ptpLocked,
    underlyings: [PTP],
    unlockAt: Number(unlockTime),
    rewards: undefined,
    category: 'lock',
  }
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const [stakeBalancesRes, claimableWithXp] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getStakedPtp }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.claimableWithXp }),
  ])
  const [amount, _xp] = claimableWithXp

  return {
    ...contract,
    amount: stakeBalancesRes,
    underlyings: [PTP],
    rewards: [{ ...contract, amount: amount }],
    category: 'stake',
  }
}

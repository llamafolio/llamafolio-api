import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getClaimAbleLBR: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getClaimAbleLBR',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  time2fullRedemption: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'time2fullRedemption',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReservedLBRForVesting: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getReservedLBRForVesting',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LBR: Token = {
  chain: 'ethereum',
  address: '0xed1167b6Dc64E8a366DB86F2E952A482D0981ebd',
  decimals: 18,
  symbol: 'LBR',
}

export async function getLybraVestBalance(ctx: BalancesContext, vester: Contract): Promise<Balance> {
  const [userBalance, userReservedBalance, userLockTime] = await Promise.all([
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.getClaimAbleLBR }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.getReservedLBRForVesting }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.time2fullRedemption }),
  ])

  const now = Date.now() / 1000
  const unlockAt = Number(userLockTime)

  return {
    ...vester,
    amount: userBalance + userReservedBalance,
    underlyings: [LBR],
    claimable: now > unlockAt ? userBalance : 0n,
    unlockAt,
    rewards: undefined,
    category: 'vest',
  }
}

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
} as const

const LBR: Token = {
  chain: 'ethereum',
  address: '0xf1182229b71e79e504b1d2bf076c15a277311e05',
  decimals: 18,
  symbol: 'LBR',
}

export async function getLybraVestBalance(ctx: BalancesContext, vester: Contract): Promise<Balance> {
  const [userBalance, userAutoCompoundEarned, userLockTime] = await Promise.all([
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.getClaimAbleLBR }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.earned }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.time2fullRedemption }),
  ])

  const now = Date.now() / 1000
  const unlockAt = Number(userLockTime)

  return {
    ...vester,
    amount: userBalance + userAutoCompoundEarned,
    underlyings: [LBR],
    claimable: now > unlockAt ? userBalance : 0n,
    unlockAt,
    rewards: undefined,
    category: 'vest',
  }
}

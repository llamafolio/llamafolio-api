import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { BigNumber } from 'ethers'

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
}

export async function getLybraVestBalance(ctx: BalancesContext, vester: Contract): Promise<Balance> {
  const [{ output: userBalance }, { output: userAutoCompoundEarned }, { output: userLockTime }] = await Promise.all([
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.getClaimAbleLBR }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.earned }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.time2fullRedemption }),
  ])

  const now = Date.now() / 1000
  const unlockAt = userLockTime

  return {
    ...vester,
    address: vester.address!,
    amount: BigNumber.from(userBalance).add(userAutoCompoundEarned),
    underlyings: undefined,
    claimable: now > unlockAt ? BigNumber.from(userBalance) : BN_ZERO,
    unlockAt,
    rewards: undefined,
    category: 'vest',
  }
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  getUserOverview: {
    inputs: [{ internalType: 'address', name: '_addr', type: 'address' }],
    name: 'getUserOverview',
    outputs: [
      { internalType: 'uint256', name: 'womLocked', type: 'uint256' },
      { internalType: 'uint256', name: 'veWomBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getWombatLockBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const { output: userBalances } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.getUserOverview,
  })

  return {
    ...locker,
    amount: BigNumber.from(userBalances.veWomBalance),
    underlyings: [{ ...(locker.underlyings?.[0] as Contract), amount: BigNumber.from(userBalances.womLocked) }],
    rewards: undefined,
    category: 'lock',
  }
}

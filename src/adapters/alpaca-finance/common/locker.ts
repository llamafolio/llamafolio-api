import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers/lib/ethers'

const abi = {
  locks: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'locks',
    outputs: [
      { internalType: 'int128', name: 'amount', type: 'int128' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const underlyings = locker.underlyings?.[0]
  const lockerBalancesOfRes = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locks })

  return {
    ...locker,
    amount: BigNumber.from(lockerBalancesOfRes.output.amount),
    underlyings: [underlyings as Contract],
    lock: { end: lockerBalancesOfRes.output.end },
    rewards: undefined,
    category: 'lock',
  }
}

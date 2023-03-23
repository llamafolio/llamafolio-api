import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  locked: {
    stateMutability: 'view',
    type: 'function',
    name: 'locked',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'int128' },
      { name: 'end', type: 'uint256' },
    ],
    gas: 5737,
  },
}

export async function getLockerBalance(ctx: BalancesContext, locker: Contract, underlying: Contract): Promise<Balance> {
  const lockedBalanceOf = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: abi.locked,
  })

  return {
    ...locker,
    amount: BigNumber.from(lockedBalanceOf.output.amount),
    underlyings: [underlying],
    lock: { end: lockedBalanceOf.output.end },
    rewards: undefined,
    category: 'lock',
  }
}

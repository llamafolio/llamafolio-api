import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
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
    gas: 5653,
  },
}

const bend: Token = {
  chain: 'ethereum',
  address: '0x0d02755a5700414B26FF040e1dE35D337DF56218',
  decimals: 18,
  symbol: 'BEND',
}

export async function getBendDaoLocker(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const lockedBalancesOf = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked })

  return {
    ...locker,
    underlyings: [bend],
    amount: BigNumber.from(lockedBalancesOf.output.amount),
    lock: { end: lockedBalancesOf.output.end },
    rewards: undefined,
    category: 'lock',
  }
}

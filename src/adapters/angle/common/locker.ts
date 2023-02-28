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

const angle: Token = {
  chain: 'ethereum',
  address: '0x31429d1856aD1377A8A0079410B297e1a9e214c2',
  decimals: 18,
  symbol: 'ANGLE',
}

export async function getAngleLockBalances(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const lockedBalancesOf = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked })

  return {
    ...locker,
    underlyings: [angle],
    amount: BigNumber.from(lockedBalancesOf.output.amount),
    lock: { end: lockedBalancesOf.output.end },
    rewards: undefined,
    category: 'lock',
  }
}

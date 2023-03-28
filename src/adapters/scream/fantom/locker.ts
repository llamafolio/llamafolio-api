import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  locked: {
    name: 'locked',
    outputs: [
      { type: 'int128', name: 'amount' },
      { type: 'uint256', name: 'end' },
    ],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 3359,
  },
}

const SCREAM: Token = {
  chain: 'fantom',
  address: '0xe0654c8e6fd4d733349ac7e09f6f23da256bf475',
  decimals: 18,
  symbol: 'SCREAM',
}

export async function getScreamLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance> {
  const { output: lockedBalances } = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked })

  return {
    ...locker,
    amount: BigNumber.from(lockedBalances.amount),
    unlockAt: lockedBalances.end,
    underlyings: [SCREAM],
    rewards: undefined,
    category: 'lock',
  }
}

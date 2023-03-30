import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
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
    gas: 5803,
  },
}

export async function getKeeperLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance> {
  const now = Math.floor(Date.now() / 1000)

  const {
    output: { amount, end },
  } = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked })

  return {
    ...locker,
    amount: BigNumber.from(amount),
    claimable: end < now ? BigNumber.from(amount) : BN_ZERO,
    unlockAt: end,
    underlyings: locker.underlyings as Contract[],
    rewards: undefined,
    category: 'lock',
  }
}

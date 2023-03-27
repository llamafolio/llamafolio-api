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
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'amount', type: 'int128' },
          { name: 'end', type: 'uint256' },
        ],
      },
    ],
    gas: 5543,
  },
  claimable: {
    name: 'claimable',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const RBN: Token = {
  chain: 'ethereum',
  address: '0x6123B0049F904d730dB3C36a31167D9d4121fA6B',
  decimals: 18,
  symbol: 'RBN',
}

export async function getLockerBalance(
  ctx: BalancesContext,
  locker: Contract,
  lockerPenaltyRewards: Contract,
): Promise<Balance> {
  const [lockedBalances, claimableLockedBalancesRewards] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked }),
    call({ ctx, target: lockerPenaltyRewards.address, params: [ctx.address], abi: abi.claimable }),
  ])

  return {
    ...locker,
    amount: BigNumber.from(lockedBalances.output.amount),
    underlyings: [RBN],
    rewards: [{ ...RBN, amount: BigNumber.from(claimableLockedBalancesRewards.output) }],
    unlockAt: lockedBalances.output.end,
    category: 'lock',
  }
}

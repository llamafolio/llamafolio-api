import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getClaimableReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getClaimableReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ASX: Token = {
  chain: 'ethereum',
  address: '0x67d85a291fcdc862a78812a3c26d55e28ffb2701',
  decimals: 18,
  symbol: 'ASX',
}

export async function getAsymetrixBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balance, pendingReward] = await Promise.all([
    getSingleStakeBalance(ctx, { ...staker, address: staker.staker }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getClaimableReward }),
  ])

  return {
    ...balance,
    rewards: [{ ...ASX, amount: BigNumber.from(pendingReward) }],
  }
}

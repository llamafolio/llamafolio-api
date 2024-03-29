import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const abi = {
  withdrawableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'withdrawableRewards',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LINK: Token = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  decimals: 18,
  symbol: 'LINK',
}

export async function getLinkStakesBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balance, earned] = await Promise.all([
    getSingleStakeBalance(ctx, staker),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.withdrawableRewards }),
  ])

  return {
    ...balance,
    rewards: [{ ...LINK, amount: earned[0] }],
  }
}

import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getWsqueeth: {
    inputs: [{ internalType: 'uint256', name: '_crabAmount', type: 'uint256' }],
    name: 'getWsqueethFromCrabAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const oSQTH: Token = {
  chain: 'ethereum',
  address: '0xf1B99e3E573A1a9C5E6B2Ce818b617F0E664E86B',
  decimals: 18,
  symbol: 'oSQTH',
}

export async function getOpynStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const amount = await call({ ctx, target: staker.address, params: [staker.amount], abi: abi.getWsqueeth })

  return {
    ...staker,
    amount: BigNumber.from(amount.output),
    underlyings: [oSQTH],
    rewards: undefined,
    category: 'stake',
  }
}

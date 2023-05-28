import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const abi = {
  xBTRFLYValue: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'xBTRFLYValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BTRFLY: Token = {
  chain: 'ethereum',
  address: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
  decimals: 9,
  symbol: 'BTRFLY',
}

export async function getwxBTRFLYStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balance = await getSingleStakeBalance(ctx, staker)

  const fmtBalances = await call({
    ctx,
    target: staker.address,
    params: [BigInt(balance.amount.toString())],
    abi: abi.xBTRFLYValue,
  })

  return {
    ...staker,
    amount: fmtBalances,
    underlyings: [BTRFLY],
    rewards: undefined,
    category: 'stake',
  }
}

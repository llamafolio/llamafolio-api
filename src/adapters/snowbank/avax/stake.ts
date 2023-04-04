import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  wsSBtosSB: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wsSBTosSB',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const SB: Token = {
  chain: 'avax',
  address: '0x7d1232b90d3f809a54eeaeebc639c62df8a8942f',
  decimals: 9,
  symbol: 'SB',
}

export async function getwsSBStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balance = await getSingleStakeBalance(ctx, staker)

  const { output: fmtBalances } = await call({
    ctx,
    target: staker.address,
    params: [balance.amount.toString()],
    abi: abi.wsSBtosSB,
  })

  return {
    ...staker,
    amount: BigNumber.from(fmtBalances),
    decimals: 9,
    underlyings: [SB],
    rewards: undefined,
    category: 'stake',
  }
}

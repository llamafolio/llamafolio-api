import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const abi = {
  sFHMValue: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'sFHMValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const FHM: Token = {
  chain: 'fantom',
  address: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
  decimals: 9,
  symbol: 'FHM',
}

export async function getwxFHMStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balance = await getSingleStakeBalance(ctx, staker)

  const fmtBalances = await call({
    ctx,
    target: staker.address,
    params: [BigInt(balance.amount.toString())],
    abi: abi.sFHMValue,
  })

  return {
    ...staker,
    amount: fmtBalances,
    decimals: 9,
    underlyings: [FHM],
    rewards: undefined,
    category: 'stake',
  }
}

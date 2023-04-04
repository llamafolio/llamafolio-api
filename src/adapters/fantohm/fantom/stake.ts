import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  sFHMValue: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'sFHMValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const FHM: Token = {
  chain: 'fantom',
  address: '0xfa1fbb8ef55a4855e5688c0ee13ac3f202486286',
  decimals: 9,
  symbol: 'FHM',
}

export async function getwxFHMStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balance = await getSingleStakeBalance(ctx, staker)

  const { output: fmtBalances } = await call({
    ctx,
    target: staker.address,
    params: [balance.amount.toString()],
    abi: abi.sFHMValue,
  })

  return {
    ...staker,
    amount: BigNumber.from(fmtBalances),
    decimals: 9,
    underlyings: [FHM],
    rewards: undefined,
    category: 'stake',
  }
}

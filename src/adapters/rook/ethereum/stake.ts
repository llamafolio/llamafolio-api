import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  underlyingBalance: {
    constant: true,
    inputs: [
      { internalType: 'address', name: '_token', type: 'address' },
      { internalType: 'address', name: '_owner', type: 'address' },
    ],
    name: 'underlyingBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getRookStakeBalances(
  ctx: BalancesContext,
  stakers: Contract[],
  tokenLists: Contract[],
): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: stakers.flatMap((staker) =>
      tokenLists.map((underlying) => ({ target: staker.address, params: [underlying.address, ctx.address] } as const)),
    ),
    abi: abi.underlyingBalance,
  })

  const balances: Balance[] = mapSuccessFilter(userBalancesRes, (res) => ({
    chain: ctx.chain,
    address: res.input.params[0],
    amount: BigNumber.from(res.output),
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}

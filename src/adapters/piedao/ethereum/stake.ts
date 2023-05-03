import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  ethBalanceOf: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'ethBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPieDaoStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] })),
    abi: abi.ethBalanceOf,
  })

  const balances: Balance[] = mapSuccessFilter(userBalances, (res, idx) => ({
    ...stakers[idx],
    amount: BigNumber.from(res.output),
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}

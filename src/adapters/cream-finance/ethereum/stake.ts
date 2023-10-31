import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CREAM: Contract = {
  chain: 'ethereum',
  address: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  decimals: 18,
  symbol: 'CREAM',
}

export async function getCreamStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const [userBalances, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], pendingRewards[i]]),

    (res, index) => {
      const staker = stakers[index]
      const [{ output: userBalance }, { output: earned }] = res.inputOutputPairs

      return {
        ...staker,
        amount: userBalance,
        underlyings: undefined,
        rewards: [{ ...CREAM, amount: earned }],
        category: 'stake',
      }
    },
  )
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const KWENTA: Token = {
  chain: 'optimism',
  address: '0x920cf626a271321c151d027030d5d08af699456b',
  decimals: 18,
  symbol: 'KWENTA',
}

export async function getKwentaStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
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
    userBalancesRes.map((_, i) => [userBalancesRes[i], userPendingRewardsRes[i]]),

    (res, index) => {
      const staker = stakers[index]
      const [{ output: userBalance }, { output: userPendingReward }] = res.inputOutputPairs

      return {
        ...staker,
        amount: userBalance,
        underlyings: undefined,
        rewards: [{ ...KWENTA, amount: userPendingReward }],
        category: 'stake',
      }
    },
  )
}

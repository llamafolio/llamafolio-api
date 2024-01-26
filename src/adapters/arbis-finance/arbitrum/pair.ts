import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  totalDeposits: {
    inputs: [],
    name: 'totalDeposits',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getArbisPairsBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [balances, deposits, supplies] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: abi.totalDeposits,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    balances.map((_, i) => [balances[i], deposits[i], supplies[i]]),

    (res, index) => {
      const pool = contracts[index]
      const underlyings = pool.underlyings as Contract[]
      const [{ output: amount }, { output: deposit }, { output: supply }] = res.inputOutputPairs

      return {
        ...pool,
        amount: BigInt(amount * deposit) / supply,
        underlyings,
        rewards: undefined,
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}

import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getERC20BalanceOf } from '@lib/erc20'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount0Current',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount1Current',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLpBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const balancesRaw = await getERC20BalanceOf(ctx, contracts as Token[])

  const nonZeroBalances = balancesRaw.filter((balance) => balance.amount > 0n)

  const calls = nonZeroBalances.map((balance) => ({
    target: balance.address,
  }))

  const [underlyingBalancesRes, totalSupplyRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getUnderlyingBalances }),
    multicall({ ctx, calls: calls, abi: erc20Abi.totalSupply }),
  ])

  for (let i = 0; i < calls.length; i++) {
    const underlyingBalances = underlyingBalancesRes[i]
    const totalSupply = totalSupplyRes[i]
    if (!underlyingBalances.success || !totalSupply.success) {
      continue
    }

    const [amount0Current, amount1Current] = underlyingBalances.output

    ;(nonZeroBalances[i].underlyings![0] as Balance).amount =
      (nonZeroBalances[i].amount * amount0Current) / totalSupply.output
    ;(nonZeroBalances[i].underlyings![1] as Balance).amount =
      (nonZeroBalances[i].amount * amount1Current) / totalSupply.output

    nonZeroBalances[i].category = 'lp'
    balances.push(nonZeroBalances[i])
  }

  return balances
}

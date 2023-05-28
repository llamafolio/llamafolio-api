import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  calcTokensForAmount: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'calcTokensForAmount',
    outputs: [
      { internalType: 'address[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const pieProvider = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const [tokensBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [BigInt(pool.amount.toString())] } as const)),
      abi: abi.calcTokensForAmount,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const tokensBalanceRes = tokensBalancesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !tokensBalanceRes.success || !totalSupplyRes.success) {
      continue
    }

    const [_tokens, amounts] = tokensBalanceRes.output

    const fmtUnderlyings = amounts.map((res, idx) => {
      const amount = (res * pool.amount) / totalSupplyRes.output
      // AutoResolve underlyings to get Decimals and Symbol does not work for DeFi++
      const decimals = underlyings[idx].decimals == 0 ? 18 : underlyings[idx].decimals
      const symbol = underlyings[idx].symbol === 'NULL' ? 'DEFI++' : underlyings[idx].symbol

      return {
        ...underlyings[idx],
        decimals,
        symbol,
        amount,
      }
    })

    balances.push({ ...pool, underlyings: fmtUnderlyings })
  }

  return balances
}

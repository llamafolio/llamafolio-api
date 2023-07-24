import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  lastPricePerShare: {
    inputs: [],
    name: 'lastPricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBabylonBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfRes, pricePerSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address })),
      abi: abi.lastPricePerShare,
    }),
  ])

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const balanceOfRes = balancesOfRes[poolIdx]
    const pricePerShareRes = pricePerSharesRes[poolIdx]

    if (!balanceOfRes.success || !pricePerShareRes.success) {
      continue
    }

    balances.push({
      ...contract,
      amount: (balanceOfRes.output * pricePerShareRes.output) / 10n ** BigInt(contract.decimals || 0),
      underlyings: contract.underlyings as Contract[],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

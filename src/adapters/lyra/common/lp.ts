import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  getTokenPrice: {
    inputs: [],
    name: 'getTokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLpLyraBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfsRes, multiplierTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.staker, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.lpToken })),
      abi: abi.getTokenPrice,
    }),
  ])

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const balancesOfRes = balancesOfsRes[idx]
    const multiplierTokenRes = multiplierTokensRes[idx]
    const underlyings = contract.underlyings as Contract[]

    if (!balancesOfRes.success || !multiplierTokenRes.success) {
      continue
    }

    balances.push({
      ...contract,
      amount: (balancesOfRes.output * multiplierTokenRes.output) / parseEther('1.0'),
      underlyings,
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}

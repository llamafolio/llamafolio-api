import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  accounts: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'accounts',
    outputs: [
      { internalType: 'int256', name: 'debt', type: 'int256' },
      { internalType: 'address[]', name: 'depositedTokens', type: 'address[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalValue: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'totalValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTransmutationBalances(
  ctx: BalancesContext,
  transmuters: Contract[],
  reactives: Contract[],
): Promise<Balance[]> {
  const synthetics: Balance[] = []

  const calls: Call<typeof abi.accounts>[] = []
  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    calls.push({ target: transmuter.address, params: [ctx.address] })
  }

  const [accountsRes, totalValuesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.accounts }),
    multicall({ ctx, calls, abi: abi.totalValue }),
  ])

  const reactivesDetailsByAddress: { [key: string]: Contract } = {}
  for (const reactive of reactives) {
    reactivesDetailsByAddress[reactive.address.toLowerCase()] = reactive
  }

  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    const borrow = transmuter.underlyings?.[0]
    const accountRes = accountsRes[idx]
    const totalValueRes = totalValuesRes[idx]

    if (!accountRes.success) continue

    const [debt, [depositedTokens]] = accountRes.output

    if (!depositedTokens) continue

    const reactiveToken = depositedTokens.toLowerCase()

    if (!reactiveToken) continue

    const synthetic: Balance = {
      ...(borrow as Contract),
      amount: debt,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    const reactiveDetails = reactivesDetailsByAddress[reactiveToken.toLowerCase()]
    const underlyings = reactiveDetails.underlyings?.[0] as Contract

    if (!totalValueRes.success || !underlyings) {
      continue
    }

    const reactive: Balance = {
      ...reactiveDetails,
      symbol: underlyings.symbol,
      amount: totalValueRes.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    synthetics.push(synthetic, reactive)
  }

  return synthetics
}

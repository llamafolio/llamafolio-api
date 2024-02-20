import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  getUserBalance: {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getUserBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPinguStakeBalance(ctx: BalancesContext, poolStore: Contract): Promise<Balance[]> {
  const assets = poolStore.underlyings as Contract[]

  const balances = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: poolStore.address, params: [asset.address, ctx.address] }) as const),
    abi: abi.getUserBalance,
  })

  return mapSuccessFilter(balances, (res) => {
    const matchingToken = assets.find((asset) => asset.address.toLowerCase() === res.input.params![0])
    if (!matchingToken) return null

    return {
      ...matchingToken,
      amount: res.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  }).filter(isNotNullish)
}

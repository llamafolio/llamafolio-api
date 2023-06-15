import type { ProviderBalancesParams } from '@adapters/badger-dao/common/provider'
import type { Balance, BalancesContext } from '@lib/adapter'
import { multicall } from '@lib/multicall'

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

export async function getArrakisProvider(
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> {
  const underlyingBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.token! } as const)),
    abi: abi.getUnderlyingBalances,
  })

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const underlyings = pool.underlyings
    const underlyingBalances = underlyingBalancesRes[i]
    if (!underlyingBalances.success) {
      continue
    }

    const [amount0Current, amount1Current] = underlyingBalances.output

    ;(underlyings![0] as Balance).amount = (pool.amount * amount0Current) / pool.totalSupply
    ;(underlyings![1] as Balance).amount = (pool.amount * amount1Current) / pool.totalSupply

    pool.underlyings = [underlyings![0], underlyings![1]]
  }

  return pools
}

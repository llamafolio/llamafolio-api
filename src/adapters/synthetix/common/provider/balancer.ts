import type { ProviderBalancesParams } from '@adapters/badger-dao/common/provider'
import type { BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  getBalance: {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'getBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBalancerProvider(
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> {
  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: pools.flatMap((pool) =>
      pool.underlyings!.map((underlying) => ({ target: pool.address, params: [underlying.address] } as const)),
    ),
    abi: abi.getBalance,
  })

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { amount, totalSupply } = pool
    const underlyings = pool.underlyings as Contract[]

    if (!underlyings) {
      continue
    }

    underlyings.forEach((underlying) => {
      const underlyingsBalanceRes = underlyingsBalancesRes[balanceOfIdx].success
        ? underlyingsBalancesRes[balanceOfIdx].output
        : 0n

      underlying.amount = (underlyingsBalanceRes! * amount) / totalSupply

      balanceOfIdx++
    })
  }

  return pools
}

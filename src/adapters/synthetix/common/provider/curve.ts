import type { ProviderBalancesParams } from '@adapters/badger-dao/common/provider'
import type { Balance, BalancesContext } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  get_pool_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
} as const

export async function getCurveProvider(
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> {
  const CURVE_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'

  const poolAddressesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.address] } as const)),
    abi: abi.get_pool_from_lp_token,
  })

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: mapSuccess(poolAddressesRes, (pool) => ({ target: CURVE_REGISTRY_ADDRESS, params: [pool.output] } as const)),
    abi: abi.get_underlying_balances,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount, totalSupply } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupply
    })
  }
  return pools
}

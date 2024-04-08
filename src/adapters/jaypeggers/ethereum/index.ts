import { getJayFarmBalances } from '@adapters/jaypeggers/ethereum/balance'
import { getJayContracts } from '@adapters/jaypeggers/ethereum/contract'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const jayFarmers: `0x${string}`[] = [
  '0x112e9fdad728adfbb1ce407a9cfa9339e1c6e130',
  '0xf70c2657c4135c2ce81977c32f7bc1e012a7226d',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getJayContracts(ctx, jayFarmers)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getJayFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1711756800,
}

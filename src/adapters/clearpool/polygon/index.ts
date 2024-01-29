import { getClearPoolsBalances } from '@adapters/clearpool/common/balance'
import { getClearPools } from '@adapters/clearpool/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'polygon',
  address: '0x215CCa938dF02c9814BE2D39A285B941FbdA79bA',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getClearPools(ctx, factory)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getClearPoolsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1652918400,
}

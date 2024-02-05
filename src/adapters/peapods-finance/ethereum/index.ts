import { getPeaPodsPools, getPeaPodsStakeBalances } from '@adapters/peapods-finance/ethereum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'ethereum',
  address: '0x0Bb39ba2eE60f825348676f9a87B7CD1e3B4AE6B',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPeaPodsPools(ctx, factory)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPeaPodsStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706140800,
}

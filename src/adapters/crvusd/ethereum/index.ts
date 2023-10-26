import { getCRVUSDBalances } from '@adapters/crvusd/ethereum/balance'
import { getCRVUSDContracts } from '@adapters/crvusd/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const crvUSD: Contract = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
  symbol: 'crvUSD',
  decimals: 18,
  stable: true,
}

const factory: Contract = {
  chain: 'ethereum',
  address: '0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCRVUSDContracts(ctx, factory)

  return {
    contracts: { pools, crvUSD },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const groups = await getCRVUSDBalances(ctx, contracts.pools || [])

  return {
    groups,
  }
}

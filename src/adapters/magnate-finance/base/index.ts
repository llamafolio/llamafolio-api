import { getMagnateMarketsBalances } from '@adapters/magnate-finance/base/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsContracts } from '@lib/compound/v2/market'

const cEther: Contract = {
  chain: 'base',
  address: '0x68725461357B7e5e059A224B3b2fC45F3654c889',
  symbol: 'cETH',
  decimals: 18,
  collateralFactor: 800000000000000000n,
  underlyings: ['0x4200000000000000000000000000000000000006'],
  rewards: undefined,
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: '0x9C1925d9fA1E9ba7aa57db36B15E29C07f5d85e2',
  })

  return {
    contracts: { markets: [...markets, cEther] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMagnateMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691107200,
}

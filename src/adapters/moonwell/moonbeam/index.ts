import { getMoonwellMarketsBalances } from '@adapters/moonwell/common/balance'
import { getMarketsContracts } from '@adapters/moonwell/common/market'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const GLMR: Token = {
  chain: 'moonbeam',
  address: '0xacc15dc74880c9944775448304b263d191c6077f',
  decimals: 18,
  symbol: 'GLMR',
}

const WELL: Token = {
  chain: 'moonbeam',
  address: '0x511aB53F793683763E5a8829738301368a2411E3',
  decimals: 18,
  symbol: 'WELL',
}

const stkWell: Contract = {
  chain: 'moonbeam',
  address: '0x8568a675384d761f36ec269d695d6ce4423cfab1',
  token: '0x511ab53f793683763e5a8829738301368a2411e3',
  underlyings: [WELL],
}

const comptroller: Contract = {
  chain: 'moonbeam',
  address: '0x8e00d5e02e65a19337cdba98bba9f84d4186a180',
  underlyings: [WELL],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(
    ctx,
    {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        '0x091608f4e4a15335145be0a279483c0f8e4c7955': '0xacc15dc74880c9944775448304b263d191c6077f',
      },
    },
    [WELL, GLMR],
  )

  return {
    contracts: { markets, stkWell },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: (...args) => getMoonwellMarketsBalances(...args, comptroller),
    stkWell: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1655856000,
}

import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const markets = await getMarketsContracts('optimism', {
    // Iron-Bank Unitroller on Optimism chain
    comptrollerAddress: '0xE0B57FEEd45e7D908f2d0DaCd26F113Cf26715BF',
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'optimism', contracts, {
    markets: getMarketsBalances,
  })

  return {
    balances,
  }
}

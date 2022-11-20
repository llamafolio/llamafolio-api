import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const markets = await getMarketsContracts('ethereum', {
    // Iron-Bank Unitroller on ETH chain
    comptrollerAddress: '0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB',
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    markets: getMarketsBalances,
  })

  return {
    balances,
  }
}

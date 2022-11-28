import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

export const getContracts = async () => {
  const markets = await getMarketsContracts('fantom', {
    // Iron-Bank Unitroller on Fantom chain
    comptrollerAddress: '0x4250A6D3BD57455d7C6821eECb6206F507576cD2',
  })

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
    markets: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    balances,
    healthFactor,
  }
}

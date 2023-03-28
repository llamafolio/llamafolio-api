import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

const comptroller: Contract = {
  chain: 'fantom',
  address: '0x260e596dabe3afc463e75b6cc05d8c46acacfb09',
}

const comptroller_v1: Contract = {
  chain: 'fantom',
  address: '0x3d3094aec3b63c744b9fe56397d36be568faebdf',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, markets_v1] = await Promise.all([
    getMarketsContracts(ctx, {
      // Scream Unitroller
      comptrollerAddress: comptroller.address,
    }),
    getMarketsContracts(ctx, {
      // Scream Unitroller
      comptrollerAddress: comptroller_v1.address,
    }),
  ])

  return {
    contracts: { markets, markets_v1 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    markets_v1: getMarketsBalances,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}

import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'

import { getNFTLocker } from '../common/locker'

const locker: Contract = {
  chain: 'optimism',
  address: '0x707648dfbf9df6b0898f78edf191b85e327e0e05',
  token: '0x00a35fd824c717879bf370e70ac6868b95870dfb',
  underlyings: ['0x00a35fd824c717879bf370e70ac6868b95870dfb'],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Iron-Bank Unitroller on Optimism chain
    comptrollerAddress: '0xE0B57FEEd45e7D908f2d0DaCd26F113Cf26715BF',
  })

  return {
    contracts: { markets, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    locker: getNFTLocker,
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}

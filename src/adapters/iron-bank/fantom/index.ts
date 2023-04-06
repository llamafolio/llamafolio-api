import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import {
  BalanceWithExtraProps,
  getHealthFactor,
  getMarketsBalances,
  getMarketsContracts,
} from '@lib/compound/v2/lending'
import { getNFTLockerBalances } from '@lib/lock'

const IB: Contract = {
  chain: 'fantom',
  address: '0x00a35fd824c717879bf370e70ac6868b95870dfb',
  symbol: 'IB',
  decimals: 18,
}

const locker: Contract = {
  chain: 'fantom',
  address: '0xBe33aD085e4a5559e964FA8790ceB83905062065',
  token: '0x00a35fd824c717879bf370e70ac6868b95870dfb',
  underlyings: ['0x00a35fd824c717879bf370e70ac6868b95870dfb'],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Iron-Bank Unitroller on Fantom chain
    comptrollerAddress: '0x4250A6D3BD57455d7C6821eECb6206F507576cD2',
  })

  return {
    contracts: { markets, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    locker: (...args) => getNFTLockerBalances(...args, IB, 'locked'),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}

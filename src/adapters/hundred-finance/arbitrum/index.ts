import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getSingleLockerBalance } from '@lib/lock'

const HND: Contract = {
  chain: 'arbitrum',
  address: '0x10010078a54396f62c96df8532dc2b4847d47ed3',
  decimals: 18,
  symbol: 'HND',
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0xBa57440fA35Fdb671E58F6F56c1A4447aB1f6C2B',
  decimals: 18,
  symbol: 'veHND',
}

export const getContracts = async (ctx: BaseContext) => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts(ctx, {
    // hundred-finance comptroller on Arbitrum chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hETH -> wETH
      '0x8e15a22853a0a60a0fbb0d875055a8e66cff0235': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
  })

  return {
    contracts: {
      pools,
      locker,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMarketsBalances,
    locker: (...args) => getSingleLockerBalance(...args, HND, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

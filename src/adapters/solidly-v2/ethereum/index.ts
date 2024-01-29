import { getSolidlyBalances } from '@adapters/solidly-v2/ethereum/balance'
import { getThenaContracts } from '@adapters/thena/bsc/pair'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter' // https://docs.solidly.com/resources/contract-addresses
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const SOLID: Token = {
  chain: 'ethereum',
  address: '0x777172d858dc1599914a1c4c6c9fc48c99a60990',
  name: 'Solidly',
  symbol: 'SOLID',
  decimals: 18,
  coingeckoId: 'solidlydex',
}

const voter: Contract = {
  chain: 'ethereum',
  address: '0x777034fEF3CCBed74536Ea1002faec9620deAe0A',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x77730ed992d286c53f3a0838232c3957daeaaf73',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getThenaContracts(ctx, voter)

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSolidlyBalances(...args, SOLID),
    locker: (...args) => getNFTLockerBalances(...args, SOLID, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1672531200,
}

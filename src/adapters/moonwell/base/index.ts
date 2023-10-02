import { getMoonwellMarketsBalances } from '@adapters/moonwell/common/balance'
import { getMarketsContracts } from '@adapters/moonwell/common/market'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const WELL: Token = {
  chain: 'base',
  address: '0xff8adec2221f9f4d8dfbafa6b9a297d17603493d',
  decimals: 18,
  symbol: 'WELL',
}

const comptroller: Contract = {
  chain: 'base',
  address: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C',
  underlyings: [WELL],
}

const rewardDistributor: Contract = {
  chain: 'base',
  address: '0xe9005b078701e2A0948D2EaC43010D35870Ad9d2',
}

const chainLinkOracle: Contract = {
  chain: 'base',
  address: '0xEC942bE8A8114bFD0396A5052c36027f2cA6a9d0',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(
    ctx,
    {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {},
    },
    [WELL],
  )

  return {
    contracts: { markets },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: (...args) => getMoonwellMarketsBalances(...args, comptroller, rewardDistributor),
  })

  return {
    groups: [{ balances }],
  }
}

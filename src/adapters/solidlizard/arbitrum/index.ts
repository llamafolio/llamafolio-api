import { getSolidlizardContracts } from '@adapters/solidlizard/arbitrum/pair'
import { getSolidlyBalances } from '@adapters/solidly-v2/ethereum/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter' // https://solidlizard.gitbook.io/solidlizard/security/contracts
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const SLIZ: Token = {
  chain: 'arbitrum',
  address: '0x463913d3a3d3d291667d53b8325c598eb88d3b0e',
  name: 'SolidLizard',
  symbol: 'SLIZ',
  decimals: 18,
  coingeckoId: 'solidlizard',
}

const voter: Contract = {
  chain: 'arbitrum',
  address: '0x98A1De08715800801E9764349F5A71cBe63F99cc',
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0x29d3622c78615A1E7459e4bE434d816b7de293e4',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSolidlizardContracts(ctx, voter)

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
    pools: (...args) => getSolidlyBalances(...args, SLIZ),
    locker: (...args) => getNFTLockerBalances(...args, SLIZ, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1676160000,
}

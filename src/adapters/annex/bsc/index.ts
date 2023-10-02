import { getAnnexFarmBalances } from '@adapters/annex/bsc/balance'
import { getAnnexContracts } from '@adapters/annex/bsc/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const Comptroller: Contract = {
  chain: 'bsc',
  address: '0xb13026db8aafa2fd6d23355533dccccbd4442f4c',
}

const annSingleFarm: Contract = {
  chain: 'bsc',
  address: '0x98936Bde1CF1BFf1e7a8012Cee5e2583851f2067',
  lpToken: '0x98936Bde1CF1BFf1e7a8012Cee5e2583851f2067',
  masterchef: '0x9c821500eaba9f9737fdaadf7984dff03edc74d1',
  pid: 2,
}

const masterchef: Contract = {
  chain: 'bsc',
  address: '0x9c821500eaba9f9737fdaadf7984dff03edc74d1',
}

const masterchef_v2: Contract = {
  chain: 'bsc',
  address: '0x9c821500eaba9f9737fdaadf7984dff03edc74d1',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, pools] = await Promise.all([
    getMarketsContracts(ctx, {
      comptrollerAddress: Comptroller.address,
      underlyingAddressByMarketAddress: {
        // cBNB -> wBNB
        '0xc5a83ad9f3586e143d2c718e8999206887ef9ddc': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      },
    }),
    getAnnexContracts(ctx, [masterchef, masterchef_v2]),
  ])

  return {
    contracts: { markets, Comptroller, masterchef, masterchef_v2, pools: [...pools, annSingleFarm] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    pools: getAnnexFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

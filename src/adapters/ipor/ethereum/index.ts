import { getIporFarmBalances } from '@adapters/ipor/ethereum/farm'
import { getIporLpBalances } from '@adapters/ipor/ethereum/lp'
import { getIporStakeBalance } from '@adapters/ipor/ethereum/stake'
import type { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const assets: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x086d4daab14741b195deE65aFF050ba184B65045',
    token: '0x8537b194BFf354c4738E9F3C81d67E3371DaDAf8',
    underlyings: ['0x6B175474E89094C44Da98b954EedeAC495271d0F'],
    storage: '0xb99f2a02c0851efdD417bd6935d2eFcd23c56e61',
  },
  {
    chain: 'ethereum',
    address: '0xC52569b5A349A7055E9192dBdd271F1Bd8133277',
    token: '0x7c0e72f431FD69560D951e4C04A4de3657621a88',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    storage: '0xB3d1c1aB4D30800162da40eb18B3024154924ba5',
  },
  {
    chain: 'ethereum',
    address: '0x33C5A44fd6E76Fc2b50a9187CfeaC336A74324AC',
    token: '0x9Bd2177027edEE300DC9F1fb88F24DB6e5e1edC6',
    underlyings: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
    storage: '0x364f116352EB95033D73822bA81257B8c1f5B1CE',
  },
]

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xcc3fc4c9ba7f8b8aa433bc586d390a70560ff366',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0xd72915b95c37ae1b16b926f85ad61cca6395409f',
  underlyings: ['0x1e4746dC744503b53b4A082cB3607B169a289090'],
}

export const getContracts = () => {
  return {
    contracts: { farmer, staker, assets },
  }
}

const getIporBalances = async (ctx: BalancesContext, assets: Contract[]) => {
  return Promise.all([getIporFarmBalances(ctx, assets, farmer), getIporLpBalances(ctx, assets)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getIporStakeBalance,
    assets: getIporBalances,
  })

  return {
    groups: [{ balances }],
  }
}

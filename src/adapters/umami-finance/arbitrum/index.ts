import {
  getcUmamiFarmBalance,
  getUmamiBoostedFarmBalances,
  getUmamiFarmBalances,
} from '@adapters/umami-finance/arbitrum/balance'
import { getUmamiBoostedPools, getUmamiPools } from '@adapters/umami-finance/arbitrum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

// https://umami-dao.gitbook.io/umami-dao/deconstructed-glp-vaults/vault-tokens-and-contract-addresses

const poolsAddresses: `0x${string}`[] = [
  // LIQUID
  '0x727eD4eF04bB2a96Ec77e44C1a91dbB01B605e42',
  '0x6a89FaF99587a12E6bB0351F2fA9006c6Cd12257',
  '0xbb84d79159d6bbe1de148dc82640caa677e06126',
  '0xe0A21a475f8DA0ee7FA5af8C1809D8AC5257607d',
  '0x37c0705A65948EA5e0Ae1aDd13552BCaD7711A23',
]

const boostedPoolsAddresses: `0x${string}`[] = [
  // BOOSTED
  '0xdca4e88c00a8800ebcebad63abdbaaaa755557f9',
  '0x83C19EC75d649aeC7c99e2C6663cA055569da7C0',
  '0xf2aD33E12A9780f1E42d878A29A3e0756008c838',
  '0xB0d9e1832BD973aBd8f3b4D710eAd21FcbEfcb7C',
  '0xEE57E7E3776e4868976F315E07A883955c9225d5',
]

const cUMAMI: Contract = {
  chain: 'arbitrum',
  address: '0x1922c36f3bc762ca300b4a46bb2102f84b1684ab',
  underlyings: ['0x2adabd6e8ce3e82f52d9998a7f64a90d294a92a4'],
}

const stakers: Contract[] = [
  { chain: 'arbitrum', address: '0xe6d557d416ff5640235119369c7e26aa18a906d7' },
  { chain: 'arbitrum', address: '0x2adabd6e8ce3e82f52d9998a7f64a90d294a92a4' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getUmamiPools(ctx, poolsAddresses)
  const boostedPools = await getUmamiBoostedPools(ctx, boostedPoolsAddresses)

  return {
    contracts: { pools, boostedPools, cUMAMI, stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getUmamiFarmBalances,
    boostedPools: getUmamiBoostedFarmBalances,
    cUMAMI: getcUmamiFarmBalance,
    stakers: getSingleStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1635811200,
}

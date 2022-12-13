import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'

import { getFarmBalances } from './farm'
import { getPoolsContracts, getPoolsSupplies } from './pools'
import { getTRUStakeBalances, getTUSDStakeBalances } from './stake'

const TRU: Token = {
  chain: 'ethereum',
  address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784',
  symbol: 'TRU',
  decimals: 8,
}

const TrueUSD: Token = {
  chain: 'ethereum',
  address: '0x0000000000085d4780B73119b644AE5ecd22b376',
  symbol: 'TUSD',
  decimals: 18,
}

const stkTRU: Contract = {
  chain: 'ethereum',
  address: '0x23696914ca9737466d8553a2d619948f548ee424',
  symbol: 'stkTRU',
  underlyings: [TRU],
  rewards: [TRU],
  decimals: 8,
}

const TUSD: Contract = {
  chain: 'ethereum',
  name: 'Legacy TrueFi TrueUSD',
  address: '0xa1e72267084192Db7387c8CC1328fadE470e4149',
  symbol: 'Legacy tfTUSD',
  underlyings: [TrueUSD],
  decimals: 18,
}

const trueMultiFarm: Contract = {
  chain: 'ethereum',
  address: '0xec6c3fd795d6e6f202825ddb56e01b3c128b0b10',
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('ethereum')

  return {
    contracts: { pools, stkTRU, TUSD },
  }
}

async function getAllBalances(ctx: BalancesContext, chain: Chain, pools: Contract[]) {
  const poolsSupplies = await getPoolsSupplies(chain, pools)
  return await getFarmBalances(ctx, chain, poolsSupplies, trueMultiFarm)
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    pools: getAllBalances,
    stkTRU: getTRUStakeBalances,
    TUSD: getTUSDStakeBalances,
  })

  return {
    balances,
  }
}

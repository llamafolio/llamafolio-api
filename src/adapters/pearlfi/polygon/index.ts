import { getPearlFarmBalances, getPearlFarmContracts } from '@adapters/pearlfi/polygon/farm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const PEARL: Token = {
  chain: 'polygon',
  address: '0x7238390d5f6f64e67c3211c343a410e2a3dec142',
  symbol: 'PEARL',
  decimals: 18,
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xf484c4ab97ee393f8d1af6948b70bd88a033cbab',
  underlyings: [PEARL],
}

const farmers: `0x${string}`[] = [
  '0xf4d40a328cb2320c94f009e936f840d2d8931721',
  '0x5e21386e8e0e6c77abd1e08e21e9d41e760d3747',
  '0x067f023d56e2c39d529e0f6586135dcd39ef8b5a',
  '0xf242f176200f18ab0a36397f10498993c8313984',
  '0xa994836261b4fa80f1cd5fee50b602c88699ab7b',
  '0xa9d0fb2581ddd3783853fb3fda9b296a2c7a0734',
  '0x99f21d87ed8a2d04cd18e44571e60e414384b678',
  '0x150d5d880f37654a78c77ef25573b6e2790b2e55',
  '0xfecbca8f3488f948da313d33ad0be25978dd00fd',
  '0x76b70cb49e8b6ff860fd4578b81e0ef9ae8a05d0',
  '0x076d07aa1f0c739873c4300ad6a4ffad39d483e3',
  '0x1696f5389fec44b99d72ee239a46d7c7e28ff8e7',
  '0x11830442b58bb9258179c9aee861b6d7ed741423',
  '0x559d82b710c32a46913f0d60421cbe1e529d2ab9',
  '0xec818c88739df6c6c005e34ce2073521f65cca86',
  '0x61bbddfd07952f017675ea2e8cc6802817f5dc82',
]

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [{ pairs, allPairsLength }, pools] = await Promise.all([
    getPairsContracts({
      ctx,
      factoryAddress: '0xd541Bc203Cc2B85810d9b8E6a534eed1615528E2',
      offset,
      limit,
    }),
    getPearlFarmContracts(ctx, farmers),
  ])

  return {
    contracts: { pairs, pools, locker },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: getPearlFarmBalances,
    locker: (...args) => getNFTLockerBalances(...args, PEARL, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

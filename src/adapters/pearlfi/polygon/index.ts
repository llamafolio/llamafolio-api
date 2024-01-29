import type { AdapterConfig } from "@lib/adapter";import { getPearlFarmBalances, getPearlFarmContracts } from '@adapters/pearlfi/polygon/farm'
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

const lockerV2: Contract = {
  chain: 'polygon',
  address: '0x017a26b18e4da4fe1182723a39311e67463cf633',
  underlyings: [PEARL],
}

const farmers: `0x${string}`[] = [
  // v2
  '0x97bd59a8202f8263c2ec39cf6cf6b438d0b45876',
  '0x85fa2331040933a02b154579fabe6a6a5a765279',
  '0x89ef6e539f2ac4ee817202f445aa69a3769a727c',
  '0x03fa7a2628d63985bdfe07b95d4026663ed96065',
  '0x39976f6328eba2a3c860b7de5cf2c1bb41581fb8',
  '0xda0afbeeebef6da2f060237d35cab759b99b13b6',
  '0x79d5ae0df5c3a31941c3afe0021f25e2929e205d',
  '0x7d02a8b758791a03319102f81bf61e220f73e43d',
  '0xdaef32ca8d699015fcfb2884f6902ffcebe51c5b',
  '0xe4a9abd56c4c42807e70909df5853347d20274ce',
  '0xd466c643bf2df284e4e3ef08103be9dfe3112dfe',
  '0x51f17604b7c6a2e9ef878cbe4cef709ed0a724c4',
  '0x1c913e7a3552f288fe3b24abc23a9950d90a4224',
  '0x5878e279c064658fe47b68f368740db03813b9ee',

  // v1
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
    contracts: { pairs, pools, locker, lockerV2 },
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
    lockerV2: (...args) => getNFTLockerBalances(...args, PEARL, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1686960000,
                  }
                  
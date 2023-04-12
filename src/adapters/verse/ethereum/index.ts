import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getVerseBalances } from './balance'
import { getVerseContracts } from './contract'

const farmers: Contract[] = [
  { chain: 'ethereum', address: '0x4efff28192029bdb1ac027c53674721875da6b10' },
  { chain: 'ethereum', address: '0x4e1f1206f2b9a651ecf2d49c5d33761861d4910c' },
  { chain: 'ethereum', address: '0xded0c22acd80e7a4bd6ec91ced451fc83f04cab2' },
  { chain: 'ethereum', address: '0xdd5a9eec299b74b2db2d3430608c1c5a8d9598eb' },
  { chain: 'ethereum', address: '0x4ba48df24008429ae9140a01e0d002f5fa6a125d' },
  { chain: 'ethereum', address: '0x17bdceec80d3506e384db09e5d5696edf70605ef' },
  { chain: 'ethereum', address: '0x8295e4b84335af685e596dbcd76bbbbadbf88b01' },
  { chain: 'ethereum', address: '0xcb2e16623b91dff38b7e5d8cb66631b375d71a0e' },
  { chain: 'ethereum', address: '0x42535f228897d309e644523189d44cff8a961dc7' },
  { chain: 'ethereum', address: '0x29e9c97de8e04a2f40508f9c379cf4f4d53447f6' },
]

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [{ pairs, allPairsLength }, pools] = await Promise.all([
    getPairsContracts({
      ctx,
      factoryAddress: '0xee3E9E46E34a27dC755a63e2849C9913Ee1A06E2',
      offset,
      limit,
    }),
    getVerseContracts(ctx, farmers),
  ])

  return {
    contracts: {
      pools,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: getVerseBalances,
  })

  return {
    groups: [{ balances }],
  }
}

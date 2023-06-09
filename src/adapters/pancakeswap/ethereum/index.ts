import { getStakersBalances } from '@adapters/pancakeswap/common/stake'
import { getPancakeFarmBalances } from '@adapters/pancakeswap/ethereum/farm'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xd7136b50e641cfff9d0aeb5c4617c779a80f0c8b',
    token: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
    underlyings: ['0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898'],
    rewards: ['0xD33526068D116cE69F19A9ee46F0bd304F21A51f'],
  },
  {
    chain: 'ethereum',
    address: '0x5a8c87047c290dd8a2e1a1a2d2341da41d1aa009',
    token: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
    underlyings: ['0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898'],
    rewards: ['0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF'],
  },
  {
    chain: 'ethereum',
    address: '0x5ec855219e236b75e7cfba0d56105b9cc88b4a18',
    token: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
    underlyings: ['0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898'],
    rewards: ['0xf203Ca1769ca8e9e8FE1DA9D147DB68B6c919817'],
  },
  {
    chain: 'ethereum',
    address: '0x3bb1cca68756a7e0ffebf59d52174784047f3de8',
    token: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
    underlyings: ['0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898'],
    rewards: ['0xE60779CC1b2c1d0580611c526a8DF0E3f870EC48'],
  },
]

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x2e71b2688019ebdfdde5a45e6921aaebb15b25fb',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
    offset,
    limit,
  })

  return {
    contracts: { pairs, masterChef, stakers },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getPancakePairsBalances(ctx: BalancesContext, pairs: Pair[], masterchef: Contract) {
  return Promise.all([getPairsBalances(ctx, pairs), getPancakeFarmBalances(ctx, pairs, masterchef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getPancakePairsBalances(...args, masterChef),
    stakers: getStakersBalances,
  })

  return {
    groups: [{ balances }],
  }
}

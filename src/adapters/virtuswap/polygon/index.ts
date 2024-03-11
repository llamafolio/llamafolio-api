import { getVirtuFarmBalances } from '@adapters/virtuswap/common/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const farmer: Contract = {
  chain: 'polygon',
  address: '0x9c58a2b79cd054442d5970b925637b9e88e7ecc2',
}

const oldFarmer: Contract = {
  chain: 'polygon',
  address: '0x6c2dba00f8b7308f475dc9525054a02228ac4d21',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 200

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xd4e3668a9c39ebb603f02a6987fc915dbc906b43',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      farmer,
      oldFarmer,
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
    farmer: (...args) => getVirtuFarmBalances(...args, contracts.pairs || []),
    oldFarmer: (...args) => getVirtuFarmBalances(...args, contracts.pairs || []),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1694649600,
}

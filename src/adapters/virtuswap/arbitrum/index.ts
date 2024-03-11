import { getVirtuFarmBalances } from '@adapters/virtuswap/common/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const farmer: Contract = {
  chain: 'arbitrum',
  address: '0x68748818983cd5b4cd569e92634b8505cfc41fe8',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 200

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x389DB0B69e74A816f1367aC081FdF24B5C7C2433',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      farmer,
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
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1694649600,
}

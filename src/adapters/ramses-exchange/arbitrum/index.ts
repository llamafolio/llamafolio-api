import { getRamsesLockerBalances } from '@adapters/ramses-exchange/arbitrum/locker'
import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const veNFT: Contract = {
  chain: 'arbitrum',
  address: '0xaaa343032aa79ee9a6897dab03bef967c3289a06',
  token: '0xAAA6C1E32C55A7Bfa8066A6FAE9b42650F262418',
}

export const factory: Contract = {
  chain: 'arbitrum',
  address: '0xaa2cd7477c451e703f3b9ba5663334914763edf8',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'arbitrum',
  address: '0xaa277cb7914b7e5514946da92cb9de332ce610ef',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 300

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xaaa20d08e59f6561f242b08513d36266c5a29415',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      nonFungiblePositionManager,
      veNFT,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veNFT: getRamsesLockerBalances,
    pairs: getPairsBalances,
    nonFungiblePositionManager: (ctx, nonFungiblePositionManager) =>
      getPoolsBalances(ctx, nonFungiblePositionManager, factory),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1678838400,
}

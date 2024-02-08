import { getHorizaLockerBalances } from '@adapters/horiza/arbitrum/locker'
import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const veNFT: Contract = {
  chain: 'arbitrum',
  address: '0x44cca4fb1737f6a5deb2ac1bc1f3d4075bbf9db4',
  token: '0xE594b57E7F11ec1E8Af9f003F74Fa52B7aefdc9F',
}

export const factory: Contract = {
  chain: 'arbitrum',
  address: '0x5b1c257b88537d1ce2af55a1760336288ccd28b6',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'arbitrum',
  address: '0x39f16045432dc7cb6160269724821459b35938f9',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 300

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xcf0a6698d3880626e876b361e7c5fb99164717b8',
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
    veNFT: getHorizaLockerBalances,
    pairs: getPairsBalances,
    nonFungiblePositionManager: (ctx, nonFungiblePositionManager) =>
      getPoolsBalances(ctx, nonFungiblePositionManager, factory),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1705449600,
}

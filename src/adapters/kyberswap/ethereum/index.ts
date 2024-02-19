import { getKyberswapPairs } from '@adapters/kyberswap/common/pair'
import { getKNCStakeBalance } from '@adapters/kyberswap/common/stake'
import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const sKNC: Contract = {
  chain: 'ethereum',
  address: '0xeadb96f1623176144eba2b24e35325220972b3bd',
  token: '0xdeFA4e8a7bcBA345F687a2f1456F5Edd9CE97202',
}

export const factory: Contract = {
  chain: 'ethereum',
  address: '0xc7a590291e07b9fe9e64b86c58fd8fc764308c4a',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0xe222fbe074a436145b255442d919e4e3a6c6a480',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPoolsLength } = await getKyberswapPairs({
    ctx,
    factoryAddress: '0x833e4083b7ae46cea85695c4f7ed25cdad8886de',
    offset,
    limit,
  })

  return {
    contracts: { pairs, nonFungiblePositionManager, sKNC },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPoolsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sKNC: getKNCStakeBalance,
    pairs: getPairsBalances,
    nonFungiblePositionManager: (ctx, nonFungiblePositionManager) =>
      getPoolsBalances(ctx, nonFungiblePositionManager, factory),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1604098800,
}

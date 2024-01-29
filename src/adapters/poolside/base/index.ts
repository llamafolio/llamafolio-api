import { getPoolSideStakeBalance } from '@adapters/poolside/base/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const rcbETH: Contract = {
  chain: 'base',
  address: '0x692ef3afd21f172680b82285759bc13cf8e70710',
  decimals: 18,
  symbol: 'rcbETH',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x75a92DfB38C3506dcE3Bbb5EB32A10852f9ba64a',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      rcbETH,
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
    rcbETH: getPoolSideStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1697673600,
}

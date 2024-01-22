import { getIntegralStakeBalances } from '@adapters/integral/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xffc0eac1a1ae79c697607229aca43ef422625a40',
  token: '0xD502F487e1841Fdc805130e13eae80c61186Bc98',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xc480b33ee5229de3fbdfad1d2dcd3f3bad0c56c6',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      staker,
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
    staker: getIntegralStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const sSPARTA: Contract = {
  chain: 'arbitrum',
  address: '0xdeab92d6a3618f6d830c925d7ae8f1c87eecf01f',
  token: '0x11f98c7e42a367dab4f200d2fdc460fb445ce9a8',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xfe8ec10fe07a6a6f4a2584f8cd9fe232930eaf55',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      sSPARTA,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    sSPARTA: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691020800,
}

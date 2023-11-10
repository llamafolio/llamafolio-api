import { getMiniChefPoolInfos } from '@adapters/apeswap-amm/polygon/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const miniChef: Contract = {
  chain: 'polygon',
  address: '0x54aff400858dcac39797a81894d9920f16972d1d',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: miniChef.address,
      getPoolInfos: (...args) => getMiniChefPoolInfos(...args),
    }),
    getPairsContracts({
      ctx,
      factoryAddress: '0xcf083be4164828f00cae704ec15a36d711491284',
      offset,
      limit,
    }),
  ])

  return {
    contracts: { pairs, pools },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: (...args) => getMasterChefPoolsBalances(...args, { masterChefAddress: miniChef.address }),
  })

  return {
    groups: [{ balances }],
  }
}

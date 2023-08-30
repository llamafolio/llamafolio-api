// import { getAlienBalances } from '@adapters/alien-base/base/balance'
import { getAlienFarmBalances } from '@adapters/alien-base/base/balance'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts, type Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const masterChef: Contract = {
  chain: 'base',
  address: '0x52eaecac2402633d98b95213d0b473e069d86590',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x3E84D913803b02A4a7f027165E8cA42C14C0FdE7',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getAlienBalances(ctx: BalancesContext, pairs: Pair[], masterChef: Contract) {
  return Promise.all([getPairsBalances(ctx, pairs), getAlienFarmBalances(ctx, pairs, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getAlienBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}

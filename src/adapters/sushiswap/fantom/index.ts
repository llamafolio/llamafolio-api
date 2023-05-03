import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const miniChef: Contract = {
  name: 'miniChef',
  displayName: 'MiniChef',
  chain: 'fantom',
  address: '0xf731202A3cf7EfA9368C2d7bD613926f7A144dB5',
}

const sushi: Token = {
  chain: 'fantom',
  address: '0xae75A438b2E0cB8Bb01Ec1E1e376De11D44477CC',
  symbol: 'SUSHI',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
    offset,
    limit,
  })

  return {
    contracts: {
      miniChef,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getSushiswapPairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getSushiswapPairsBalances(...args, miniChef, sushi, 'Sushi', true),
  })

  return {
    groups: [{ balances }],
  }
}

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
  chain: 'polygon',
  address: '0x0769fd68dfb93167989c6f7254cd0d766fb2841f',
}

const sushi: Token = {
  chain: 'polygon',
  address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a',
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

import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const leon: Token = {
  chain: 'bsc',
  address: '0x27e873bee690c8e161813de3566e9e18a64b0381',
  decimals: 18,
  symbol: 'LEON',
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0x72F8fE2489A4d480957d5dF9924166e7a8DDaBBf',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xEB10f4Fe2A57383215646b4aC0Da70F8EDc69D4F',
    offset,
    limit,
  })

  return {
    contracts: {
      masterChef,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getLeonicornswapPairsBalances(
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

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getLeonicornswapPairsBalances(...args, masterChef, leon, 'Leon'),
  })

  return {
    groups: [{ balances }],
  }
}

import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getZyberFarm3poolsBalances, getZyberFarmBalances } from './balance'

const zyber: Token = {
  chain: 'arbitrum',
  address: '0x3b475f6f2f41853706afc9fa6a6b8c5df1a2724c',
  decimals: 18,
  symbol: 'ZYB',
}

const stablePool: Contract = {
  chain: 'arbitrum',
  address: '0x969f7699fbB9C79d8B61315630CDeED95977Cfb8',
  symbol: '3pool',
  pid: 7,
  lpToken: '0x1a90a043751a364447110ff95cca05ae752d85be',
  decimals: 18,
  underlyings: [
    '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  ],
  rewards: [
    '0x3b475f6f2f41853706afc9fa6a6b8c5df1a2724c',
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  ],
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x9BA666165867E916Ee7Ed3a3aE6C19415C2fBDDD',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xaC2ee06A14c52570Ef3B9812Ed240BCe359772e7',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      masterChef,
      stablePool,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getZyberswapPairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getZyberFarmBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getZyberswapPairsBalances(...args, masterChef, zyber, 'Tokens', false),
    stablePool: (...args) => getZyberFarm3poolsBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}

import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakeBalances } from './stake'

const PAN: Token = {
  chain: 'bsc',
  address: '0x72e3d54293e2912fC66Cf4a93625Ac8305E3120D',
  decimals: 18,
  symbol: 'PAN',
}

const PSR: Token = {
  chain: 'bsc',
  address: '0xb72ba371c900aa68bb9fa473e93cfbe212030fcb',
  decimals: 18,
  symbol: 'PSR',
}

const panStaker: Contract = {
  chain: 'bsc',
  address: '0xD26310f0C5485a60a2EeaCb6786Fd83847EbE0ef',
  underlyings: [PAN],
  rewards: [PAN],
}

const psrStaker: Contract = {
  chain: 'bsc',
  address: '0x2dc4a08edbEeC961605868726C9abB6782aA2871',
  underlyings: [PSR],
  rewards: [PAN],
}

const masterChef: Contract = {
  name: 'Pandora farming',
  chain: 'bsc',
  address: '0xB0Df6DeEd5ad4f1567091f509425C4645fB3Ce54',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xFf9A4E72405Df3ca3D909523229677e6B2b8dC71',
    offset,
    limit,
  })

  return {
    contracts: {
      stakers: [panStaker, psrStaker],
      masterChef,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getPandoraPairsBalances(
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
    pairs: (...args) => getPandoraPairsBalances(...args, masterChef, PAN, 'Reward', true),
    stakers: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1653091200,
}

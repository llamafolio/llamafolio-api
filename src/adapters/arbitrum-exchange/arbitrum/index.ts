import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getArxMasterChefPoolsBalances, getStakerBalances } from './balance'

const stakers: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x75bca51be93e97ff7d3198506f368b472730265a',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0x82af49447d8a07e3bd95bd0d56f35241523fbab1'],
  },
  {
    chain: 'arbitrum',
    address: '0x907e5d334f27a769ef779358089fe5fdaa6cf2bb',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'],
  },
  {
    chain: 'arbitrum',
    address: '0x466f4380327cd948572ae0c98f2e04930ce05767',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  },
  {
    chain: 'arbitrum',
    address: '0xf4752a5f352459948620e7c377b10ddcc92015c8',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0x912ce59144191c1204e64559fe8253a0e49e6548'],
  },
  {
    chain: 'arbitrum',
    address: '0xe633c4321b066c1348b8d1694461bc58161a8125',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0x0d702ebdef2c47eb33951098db4f06bd8cca8105'],
  },
  {
    chain: 'arbitrum',
    address: '0x49b190c6c7bf1bbb3765cbe4e0823b44e8a81f9f',
    token: '0xd5954c3084a1ccd70b4da011e67760b8e78aee84',
    underlyings: ['0xd5954c3084a1ccd70b4da011e67760b8e78aee84'],
    rewards: ['0x0d702ebdef2c47eb33951098db4f06bd8cca8105'],
  },
]

const ARX: Token = {
  chain: 'arbitrum',
  address: '0xD5954c3084a1cCd70B4dA011E67760B8e78aeE84',
  decimals: 18,
  symbol: 'ARX',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0xd2bcFd6b84E778D2DE5Bb6A167EcBBef5D053A06',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1500

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x1C6E968f2E6c9DEC61DB874E28589fd5CE3E1f2c',
    offset,
    limit,
  })

  return {
    contracts: {
      masterChef,
      pairs,
      stakers,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export async function getArxPairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getArxMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getArxPairsBalances(...args, masterChef, ARX, 'Arx'),
    stakers: getStakerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

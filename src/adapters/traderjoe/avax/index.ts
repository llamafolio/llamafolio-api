import { GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getStakeBalance } from './balances'

const sJOE: Contract = {
  name: 'sJOE staking',
  chain: 'avax',
  address: '0x1a731b2299e22fbac282e7094eda41046343cb51',
  types: 'stake',
}

const veJOE: Contract = {
  name: 'veJOE staking',
  chain: 'avax',
  address: '0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341',
  types: 'stake',
}

const rJOE: Contract = {
  name: 'rJOE staking',
  chain: 'avax',
  address: '0x102D195C3eE8BF8A9A89d63FB3659432d3174d81',
  types: 'stake',
}

export const getContracts = async (props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const markets = await getMarketsContracts('avax', {
    comptrollerAddress: '0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC',
  })

  const pools = await getPairsContracts({
    chain: 'avax',
    factoryAddress: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
    offset,
    limit,
  })

  return {
    contracts: {
      markets,
      pools,
      sJOE,
      veJOE,
      rJOE,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: offset + limit,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, stakeBalances] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, 'avax', contracts, {
      markets: getMarketsBalances,
      pools: getPairsBalances,
    }),
    getStakeBalance(ctx, 'avax'),
  ])

  return {
    balances: [...balances, ...stakeBalances],
  }
}

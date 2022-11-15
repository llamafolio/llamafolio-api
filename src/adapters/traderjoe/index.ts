import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { Contract } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { isNotNullish } from '@lib/type'
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

const getContracts = async () => {
  const markets = await getMarketsContracts('avax', {
    comptrollerAddress: '0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC',
  })

  const pools = await getPairsContracts({
    chain: 'avax',
    factoryAddress: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
    length: 100,
  })

  return {
    contracts: { markets, pools, sJOE, veJOE, rJOE },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { markets, pools }) => {
  const balances = (
    await Promise.all([
      getMarketsBalances(ctx, 'avax', markets || []),
      getPairsBalances(ctx, 'avax', pools || []),
      getStakeBalance(ctx, 'avax'),
    ])
  )
    .flat()
    .filter(isNotNullish)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'trader-joe',
  getContracts,
  getBalances,
}

export default adapter

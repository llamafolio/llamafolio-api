import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'optimism',
  address: '0x0994206dfe8de6ec6920ff4d779b0d950605fb53',
  decimals: 18,
  symbol: 'CRV',
}

export const getContracts = async () => {
  const registries = await getRegistries('optimism', ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts('optimism', registries)
  const gauges = await getGaugesContracts('optimism', registries, pools, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'optimism', contracts, {
    pools: (ctx, chain, pools) => getPoolsBalances(ctx, chain, pools, { getPoolAddress: (contract) => contract.pool }),
    gauges: getGaugesBalances,
  })

  return {
    balances,
  }
}

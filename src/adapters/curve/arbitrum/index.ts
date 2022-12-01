import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'arbitrum',
  address: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978',
  decimals: 18,
  symbol: 'CRV',
}

export const getContracts = async () => {
  const registries = await getRegistries('arbitrum', ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts('arbitrum', registries)
  const gauges = await getGaugesContracts('arbitrum', registries, pools, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    pools: (ctx, chain, pools) => getPoolsBalances(ctx, chain, pools, { getPoolAddress: (contract) => contract.pool }),
    gauges: getGaugesBalances,
  })

  return {
    balances,
  }
}

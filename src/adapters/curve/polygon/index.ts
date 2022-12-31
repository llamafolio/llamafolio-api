import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'polygon',
  address: '0x172370d5cd63279efa6d502dab29171933a610af',
  decimals: 18,
  symbol: 'CRV',
}

export const getContracts = async () => {
  const registries = await getRegistries('polygon', ['stableSwap', 'stableFactory', 'cryptoSwap', 'cryptoFactory'])
  const pools = await getPoolsContracts('polygon', registries)
  const gauges = await getGaugesContracts('polygon', registries, pools, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, { getPoolAddress: (contract) => contract.pool }),
    gauges: getGaugesBalances,
  })

  return {
    balances,
  }
}

import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'

import { getGaugesBalances, getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'fantom',
  address: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
  decimals: 18,
  symbol: 'CRV',
}

export const getContracts = async () => {
  const registries = await getRegistries('fantom', ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts('fantom', registries)
  const gauges = await getGaugesContracts('fantom', registries, pools, CRV)

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

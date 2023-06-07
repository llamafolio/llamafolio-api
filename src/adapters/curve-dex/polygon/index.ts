import { getGaugesBalances, getPoolsBalances } from '@adapters/curve-dex/common/balance'
import { getGaugesContracts } from '@adapters/curve-dex/common/gauge'
import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'polygon',
  address: '0x172370d5cd63279efa6d502dab29171933a610af',
  decimals: 18,
  symbol: 'CRV',
}

const xChainGaugesFactory: Contract = {
  chain: 'polygon',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap', 'cryptoFactory'])
  const pools = await getPoolsContracts(ctx, registries)
  const gauges = await getGaugesContracts(ctx, pools, xChainGaugesFactory, CRV)

  return {
    contracts: {
      gauges,
      pools,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPoolsBalances,
    gauges: getGaugesBalances,
  })

  return {
    groups: [{ balances }],
  }
}

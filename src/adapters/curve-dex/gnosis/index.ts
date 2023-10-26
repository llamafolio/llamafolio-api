import { getGaugesBalances, getPoolsBalances } from '@adapters/curve-dex/common/balance'
import { getGaugesContracts } from '@adapters/curve-dex/common/gauge'
import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const CRV: Token = {
  chain: 'gnosis',
  address: '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',
  decimals: 18,
  symbol: 'CRV',
}

const xChainGaugesFactory: Contract = {
  chain: 'gnosis',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts(ctx, registries)
  const gauges = await getGaugesContracts(ctx, pools, xChainGaugesFactory, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
    revalidate: 60 * 60,
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

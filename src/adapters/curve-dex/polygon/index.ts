import { getPoolsBalances } from '@adapters/curve-dex/common/balance'
import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import { getGaugesContracts } from '@adapters/curve-dex/commonz/gauges'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const CRV: Token = {
  chain: 'polygon',
  address: '0x172370d5cd63279efa6d502dab29171933a610af',
  decimals: 18,
  symbol: 'CRV',
}

const xChainGaugesFactory: Contract = {
  chain: 'polygon',
  address: '0xabc000d88f23bb45525e447528dbf656a9d55bf5',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
  const pools = await getPoolsContracts(ctx, [
    registries.stableSwap!,
    registries.stableFactory!,
    registries.cryptoSwap!,
  ])

  const gauges = await getGaugesContracts(ctx, pools, xChainGaugesFactory, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPoolsBalances,
    // gauges: getGaugesBalances,
  })

  return {
    groups: [{ balances }],
  }
}

import { getGaugesBalances, getPoolsBalances } from '@adapters/curve-dex/common/balance'
import { getGaugesContracts } from '@adapters/curve-dex/common/gauge'
import { getPoolsContracts } from '@adapters/curve-dex/common/pool'
import { getRegistries } from '@adapters/curve-dex/common/registries'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const CRV: Token = {
  chain: 'avalanche',
  address: '0x249848beca43ac405b8102ec90dd5f22ca513c06',
  decimals: 18,
  symbol: 'CRV.e',
}

const xChainGaugesFactory: Contract = {
  chain: 'avalanche',
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

import { getAvaxGaugesBalances, getAvaxPoolsBalances } from '@adapters/curve-dex/avalanche/balance'
import { getAvaxGaugesContracts } from '@adapters/curve-dex/avalanche/gauge'
import { getAvaxPoolsContracts } from '@adapters/curve-dex/avalanche/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getRegistries } from '../common/registries'

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
  const pools = await getAvaxPoolsContracts(ctx, [
    registries.stableSwap!,
    registries.stableFactory!,
    registries.cryptoSwap!,
  ])
  const gauges = await getAvaxGaugesContracts(ctx, pools, xChainGaugesFactory, CRV)

  return {
    contracts: {
      pools,
      gauges,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getAvaxPoolsBalances,
    gauges: getAvaxGaugesBalances,
  })

  return {
    groups: [{ balances }],
  }
}

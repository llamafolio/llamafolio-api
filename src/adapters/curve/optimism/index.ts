import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGaugesBalances, getPoolsBalances } from '../common/balance'
import { getGaugesContracts } from '../common/gauges'
import { getPoolsContracts } from '../common/pools'
import { getRegistries } from '../common/registries'

const CRV: Token = {
  chain: 'optimism',
  address: '0x0994206dfe8de6ec6920ff4d779b0d950605fb53',
  decimals: 18,
  symbol: 'CRV',
}

const xChainGaugesFactory: Contract = {
  chain: 'optimism',
  address: '0xabC000d88f23Bb45525E447528DBF656A9D55bf5',
}

export const getContracts = async (ctx: BaseContext) => {
  const registries = await getRegistries(ctx, ['stableSwap', 'stableFactory', 'cryptoSwap'])
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
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, undefined, true),
    gauges: (...args) => getGaugesBalances(...args, undefined, true),
  })

  return {
    groups: [{ balances }],
  }
}

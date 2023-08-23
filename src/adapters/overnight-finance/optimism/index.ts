import { getOvernightFarmBalances, getOvernightStakeBalance } from '@adapters/overnight-finance/common/balance'
import { farmers } from '@adapters/overnight-finance/optimism/contract'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'optimism',
  address: '0xa348700745d249c3b49d2c2acac9a5ae8155f826',
  underlyings: ['0x73cb180bf0521828d8849bc8cf2b920918e23032'],
}

export const getContracts = () => {
  return {
    contracts: { farmers, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getOvernightFarmBalances,
    staker: getOvernightStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

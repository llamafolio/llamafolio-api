import { getOvernightFarmBalances, getOvernightStakeBalance } from '@adapters/overnight-finance/common/balance'
import { farmers } from '@adapters/overnight-finance/polygon/contract'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'polygon',
  address: '0x4e36d8006416ea1d939a0eeae73afdaca86bd376',
  underlyings: ['0x236eec6359fb44cce8f97e99387aa7f8cd5cde1f'],
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

import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'
import { getSingleLockerBalance } from '@lib/lock'

const HND: Contract = {
  chain: 'optimism',
  address: '0x10010078a54396F62c96dF8532dc2B4847d47ED3',
  decimals: 18,
  symbol: 'HND',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0x1F8e8472e124F58b7F0D2598EaE3F4f482780b09',
  decimals: 18,
  symbol: 'veHND',
}

export const getContracts = async (ctx: BaseContext) => {
  const comptrollerAddress = '0x0f390559f258eb8591c8e31cf0905e97cf36ace2'

  const pools = await getMarketsContracts(ctx, {
    // hundred-finance comptroller on Optimism chain
    comptrollerAddress,
    underlyingAddressByMarketAddress: {
      // hETH -> wETH
      '0xe8f12f5492ec28609d2932519456b7436d6c93bd': '0x4200000000000000000000000000000000000006',
    },
  })

  return {
    contracts: {
      pools,
      locker,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getMarketsBalances,
    locker: (...args) => getSingleLockerBalance(...args, HND, 'locked'),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}

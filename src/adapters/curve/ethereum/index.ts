import { GetBalancesHandler } from '@lib/adapter'
import { isNotNullish } from '@lib/type'

import { getGaugeBalances, getGaugesContracts } from './gauges'
import { feeDistributorContract, getLockedBalances, lockerContract } from './locker'
import { getPoolsBalances, getPoolsContracts } from './pools'

export const getContracts = async () => {
  const pools = await getPoolsContracts()
  const gauges = await getGaugesContracts('ethereum', pools)
  const locker = lockerContract

  return {
    contracts: { pools, gauges, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools, gauges, locker }) => {
  const balances = (
    await Promise.all([
      locker ? getLockedBalances(ctx, 'ethereum', locker.address, feeDistributorContract.address) : null,
      getPoolsBalances(ctx, 'ethereum', pools),
      getGaugeBalances(ctx, 'ethereum', gauges),
    ])
  )
    .flat()
    .filter(isNotNullish)

  return {
    balances,
  }
}

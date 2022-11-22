import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getAllPools, getPoolBalances } from './pools'
import { getStakeBalances } from './stake'

const locker: Contract = {
  name: 'Locker',
  displayName: 'Convex Locker',
  chain: 'ethereum',
  address: '0x72a19342e8f1838460ebfccef09f6585e32db86e',
}

const cvxCRVStaker: Contract = {
  name: 'cvxCRVStaker',
  displayName: 'cvxCRV Staker',
  chain: 'ethereum',
  address: '0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e',
}

export const getContracts = async () => {
  const pools = (await getAllPools()) as Contract[]

  return {
    contracts: { locker, cvxCRVStaker, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { pools }) => {
  let balances = await getPoolBalances(ctx, 'ethereum', pools)

  const stakersBalances = await getStakeBalances(ctx, 'ethereum', [locker, cvxCRVStaker])
  balances = balances.concat(stakersBalances)

  return {
    balances: balances,
  }
}

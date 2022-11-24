import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool BSC',
  chain: 'bsc',
  address: '0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47',
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, {
    stakingContract: getStakeBalances,
  })

  return {
    balances,
  }
}

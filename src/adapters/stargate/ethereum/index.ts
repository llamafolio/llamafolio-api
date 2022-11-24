import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Mainnet',
  chain: 'ethereum',
  address: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    stakingContract: getStakeBalances,
  })

  return {
    balances,
  }
}

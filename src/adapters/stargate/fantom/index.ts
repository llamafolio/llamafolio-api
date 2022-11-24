import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Fantom',
  chain: 'fantom',
  address: '0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03',
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
    stakingContract: getStakeBalances,
  })

  return {
    balances,
  }
}

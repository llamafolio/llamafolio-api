import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Avalanche',
  chain: 'avax',
  address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'avax', contracts, {
    stakingContract: getStakeBalances,
  })

  return {
    balances,
  }
}

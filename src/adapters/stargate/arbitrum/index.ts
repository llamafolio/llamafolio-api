import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Arbitrum',
  chain: 'arbitrum',
  address: '0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176',
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    stakingContract: getStakeBalances,
  })

  return {
    balances,
  }
}

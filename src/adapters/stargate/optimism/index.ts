import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from './stake'

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Optimism',
  chain: 'optimism',
  address: '0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2',
  rewards: [OP],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, lpStaking)

  return {
    contracts: { lpStaking, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getStakeBalances(...args, lpStaking),
  })

  return {
    balances,
  }
}

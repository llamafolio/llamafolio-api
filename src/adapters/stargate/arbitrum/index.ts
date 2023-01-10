import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from '../common/stake'

const STG: Token = {
  chain: 'arbitrum',
  address: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
  decimals: 18,
  symbol: 'STG',
}

const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Arbitrum',
  chain: 'arbitrum',
  address: '0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176',
  rewards: [STG],
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

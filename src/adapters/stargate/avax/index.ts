import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from '../common/stake'

const STG: Token = {
  chain: 'avax',
  address: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
  decimals: 18,
  symbol: 'STG',
}
const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Avalanche',
  chain: 'avax',
  address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
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

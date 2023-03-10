import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getPoolsContracts } from '../common/contracts'
import { getStakeBalances } from '../common/stake'

const STG: Token = {
  chain: 'ethereum',
  address: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
  decimals: 18,
  symbol: 'STG',
}

const lpStaking: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Mainnet',
  chain: 'ethereum',
  address: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
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
    groups: [{ balances }],
  }
}

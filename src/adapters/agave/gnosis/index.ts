import { getAgaveStakeBalance } from '@adapters/agave/gnosis/stake'
import { getLendingPoolBalances, getLendingPoolContracts } from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'gnosis',
  address: '0x5e15d5e33d318dced84bfe3f4eace07909be6d9c',
}

const staker: Contract = {
  chain: 'gnosis',
  address: '0x610525b415c1bfaeab1a3fc3d85d87b92f048221',
  underlyings: ['0x3a97704a1b25f08aa230ae53b352e2e72ef52843'],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLendingPoolContracts(ctx, lendingPool)

  return {
    contracts: { staker, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getAgaveStakeBalance,
    pools: getLendingPoolBalances,
  })

  return {
    groups: [{ balances }],
  }
}

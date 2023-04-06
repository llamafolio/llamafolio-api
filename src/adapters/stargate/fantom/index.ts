import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'fantom',
  address: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'fantom', address: '0x12edeA9cd262006cC3C4E77c90d2CD2DD4b1eb97', rewards: [STG] },
]

const farmStakings: Contract[] = [{ chain: 'fantom', address: '0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03' }]

const locker: Contract = {
  chain: 'fantom',
  address: '0x933421675cdc8c280e5f21f0e061e77849293dba',
  decimals: 18,
  symbol: 'veSTG',
  underlyings: [STG],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getStargateLpContracts(ctx, lpStakings)

  return {
    contracts: { pools, locker },
  }
}

const stargateBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getStargateLPBalances(ctx, pools), getStargateFarmBalances(ctx, pools, farmStakings)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: stargateBalances,
    locker: (...args) => getSingleLockerBalance(...args, STG, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

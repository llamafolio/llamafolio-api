import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'polygon',
  address: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'polygon', address: '0x1205f31718499dBf1fCa446663B532Ef87481fe1', rewards: [STG] },
  { chain: 'polygon', address: '0x29e38769f23701A2e4A8Ef0492e19dA4604Be62c', rewards: [STG] },
  { chain: 'polygon', address: '0x1c272232Df0bb6225dA87f4dEcD9d37c32f63Eea', rewards: [STG] },
  { chain: 'polygon', address: '0x8736f92646B2542B3e5F3c63590cA7Fe313e283B' },
]

const farmStakings: Contract[] = [{ chain: 'polygon', address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98' }]

const locker: Contract = {
  chain: 'polygon',
  address: '0x3ab2da31bbd886a7edf68a6b60d3cde657d3a15d',
  decimals: 18,
  symbol: 'veSTG',
  underlyings: [STG],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getStargateLpContracts(ctx, lpStakings)

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
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

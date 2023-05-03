import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'avalanche',
  address: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'avalanche', address: '0x1205f31718499dBf1fCa446663B532Ef87481fe1', rewards: [STG] },
  { chain: 'avalanche', address: '0x29e38769f23701A2e4A8Ef0492e19dA4604Be62c', rewards: [STG] },
  { chain: 'avalanche', address: '0x1c272232Df0bb6225dA87f4dEcD9d37c32f63Eea', rewards: [STG] },
  { chain: 'avalanche', address: '0x8736f92646B2542B3e5F3c63590cA7Fe313e283B' },
  { chain: 'avalanche', address: '0xEAe5c2F6B25933deB62f754f239111413A0A25ef' },
  { chain: 'avalanche', address: '0x45524dc9d05269e1101ad7cff1639ae2aa20989d' },
]

const farmStakings: Contract[] = [{ chain: 'avalanche', address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98' }]

const locker: Contract = {
  chain: 'avalanche',
  address: '0xca0f57d295bbce554da2c07b005b7d6565a58fce',
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

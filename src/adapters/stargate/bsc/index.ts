import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLockerBalances } from '../common/locker'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'bsc',
  address: '0xb0d502e938ed5f4df2e681fe6e419ff29631d62b',
  decimals: 18,
  symbol: 'STG',
}

const Metis: Token = {
  chain: 'bsc',
  address: '0xe552fb52a4f19e44ef5a967632dbc320b0820639',
  decimals: 18,
  symbol: 'Metis',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'bsc', address: '0x9aA83081AA06AF7208Dcc7A4cB72C94d057D2cda', rewards: [STG] },
  { chain: 'bsc', address: '0x98a5737749490856b401DB5Dc27F522fC314A4e1', rewards: [STG] },
  { chain: 'bsc', address: '0x4e145a589e4c03cBe3d28520e4BF3089834289Df' },
  { chain: 'bsc', address: '0x7BfD7f2498C4796f10b6C611D9db393D3052510C' },
  { chain: 'bsc', address: '0xD4CEc732b3B135eC52a3c0bc8Ce4b8cFb9dacE46' },
  { chain: 'bsc', address: '0x68C6c27fB0e02285829e69240BE16f32C5f8bEFe', rewards: [Metis] },
]

const farmStakings: Contract[] = [
  { chain: 'bsc', address: '0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47' },
  { chain: 'bsc', address: '0x2c6dcEd426D265045737Ff55C2D746C11b2F457a' },
]

const locker: Contract = {
  chain: 'bsc',
  address: '0xd4888870c8686c748232719051b677791dbda26d',
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
    locker: getStargateLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

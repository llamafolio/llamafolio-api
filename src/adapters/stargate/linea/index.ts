import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'linea',
  address: '0x808d7c71ad2ba3fa531b068a2417c63106bc0949',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'linea', address: '0xAad094F6A75A14417d39f04E690fC216f080A41a', rewards: [STG] },
]

const farmStakings: Contract[] = [{ chain: 'linea', address: '0x4a364f8c717caad9a442737eb7b8a55cc6cf18d8' }]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getStargateLpContracts(ctx, lpStakings)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

const stargateBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getStargateLPBalances(ctx, pools), getStargateFarmBalances(ctx, pools, farmStakings)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: stargateBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1696032000,
}

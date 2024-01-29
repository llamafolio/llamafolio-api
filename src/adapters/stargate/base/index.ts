import type { AdapterConfig } from "@lib/adapter";import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'base',
  address: '0xE3B53AF74a4BF62Ae5511055290838050bf764Df',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'base', address: '0x4c80e24119cfb836cdf0a6b53dc23f04f7e652ca', rewards: [STG] },
  { chain: 'base', address: '0x28fc411f9e1c480ad312b3d9c60c22b965015c6b', rewards: [STG] },
]

const farmStakings: Contract[] = [{ chain: 'base', address: '0x06eb48763f117c7be887296cdcdfad2e4092739c' }]

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
                  
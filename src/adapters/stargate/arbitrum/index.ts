import type { AdapterConfig } from "@lib/adapter";import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const STG: Token = {
  chain: 'arbitrum',
  address: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
  decimals: 18,
  symbol: 'STG',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'arbitrum', address: '0x915A55e36A01285A14f05dE6e81ED9cE89772f8e', rewards: [STG] },
  { chain: 'arbitrum', address: '0x892785f33CdeE22A30AEF750F285E18c18040c3e', rewards: [STG] },
  { chain: 'arbitrum', address: '0xB6CfcF89a7B22988bfC96632aC2A9D6daB60d641', rewards: [STG] },
  { chain: 'arbitrum', address: '0xaa4BF442F024820B2C28Cd0FD72b82c63e66F56C', rewards: [STG] },
  { chain: 'arbitrum', address: '0xF39B7Be294cB36dE8c510e267B82bb588705d977' },
  { chain: 'arbitrum', address: '0x600E576F9d853c95d58029093A16EE49646F3ca5' },
]

const farmStakings: Contract[] = [
  { chain: 'arbitrum', address: '0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176' },
  { chain: 'arbitrum', address: '0x9774558534036Ff2E236331546691b4eB70594b1' },
]

const locker: Contract = {
  chain: 'arbitrum',
  address: '0xfbd849e6007f9bc3cc2d6eb159c045b8dc660268',
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

                  export const config: AdapterConfig = {
                    startDate: 1647907200,
                  }
                  
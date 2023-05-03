import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'
import { getStargateVesterBalances } from './vest'

const STG: Token = {
  chain: 'ethereum',
  address: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
  decimals: 18,
  symbol: 'STG',
}

const Metis: Token = {
  chain: 'ethereum',
  address: '0x9e32b13ce7f2e80a01932b42553652e053d6ed8e',
  decimals: 18,
  symbol: 'Metis',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'ethereum', address: '0xdf0770df86a8034b3efef0a1bb3c889b8332ff56', rewards: [STG] },
  { chain: 'ethereum', address: '0x38ea452219524bb87e18de1c24d3bb59510bd783', rewards: [STG] },
  { chain: 'ethereum', address: '0x101816545f6bd2b1076434b54383a1e633390a2e', rewards: [STG] },
  { chain: 'ethereum', address: '0x430ebff5e3e80a6c58e7e6ada1d90f5c28aa116d', rewards: [Metis] },
  { chain: 'ethereum', address: '0x0faf1d2d3ced330824de3b8200fc8dc6e397850d', rewards: [STG] },
  { chain: 'ethereum', address: '0xd8772edbf88bba2667ed011542343b0eddacda47' },
  { chain: 'ethereum', address: '0x1ce66c52c36757daf6551edc04800a0ec9983a09' },
  { chain: 'ethereum', address: '0xe8f55368c82d38bbbbdb5533e7f56afc2e978cc2', rewards: [STG] },
  { chain: 'ethereum', address: '0x590d4f8a68583639f215f675f3a259ed84790580', rewards: [STG] },
  { chain: 'ethereum', address: '0xfa0f307783ac21c39e939acff795e27b650f6e68', rewards: [STG] },
  { chain: 'ethereum', address: '0x692953e758c3669290cb1677180c64183cee374e' },
]

const farmStakings: Contract[] = [
  { chain: 'ethereum', address: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b' },
  { chain: 'ethereum', address: '0x1c3000b8f475A958b87c73a5cc5780Ab763122FC' },
]

const locker: Contract = {
  chain: 'ethereum',
  address: '0x0e42acbd23faee03249daff896b78d7e79fbd58e',
  decimals: 18,
  symbol: 'veSTG',
  underlyings: [STG],
}

const vester: Contract = {
  chain: 'ethereum',
  address: '0x4dfcad285ef39fed84e77edf1b7dbc442565e55e',
  decimals: 6,
  symbol: 'aaSTG',
  underlyings: [STG],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getStargateLpContracts(ctx, lpStakings)

  return {
    contracts: { pools, locker, vester },
  }
}

const stargateBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getStargateLPBalances(ctx, pools), getStargateFarmBalances(ctx, pools, farmStakings)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: stargateBalances,
    locker: (...args) => getSingleLockerBalance(...args, STG, 'locked'),
    vester: getStargateVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}

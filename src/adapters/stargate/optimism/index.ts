import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { Token } from '@lib/token'

import { getStargateLpContracts } from '../common/contract'
import { getStargateFarmBalances } from '../common/farm'
import { getStargateLPBalances } from '../common/lp'

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

// https://stargateprotocol.gitbook.io/stargate/developers/contract-addresses/mainnet
const lpStakings: Contract[] = [
  { chain: 'optimism', address: '0xd22363e3762cA7339569F3d33EADe20127D5F98C', rewards: [OP] },
  { chain: 'optimism', address: '0xDecC0c09c3B5f6e92EF4184125D5648a66E35298', rewards: [OP] },
  { chain: 'optimism', address: '0x165137624F1f692e69659f944BF69DE02874ee27', rewards: [OP] },
  { chain: 'optimism', address: '0x368605D9C6243A80903b9e326f1Cddde088B8924', rewards: [OP] },
  { chain: 'optimism', address: '0x2F8bC9081c7FCFeC25b9f41a50d97EaA592058ae', rewards: [OP] },
  { chain: 'optimism', address: '0x3533F5e279bDBf550272a199a223dA798D9eff78' },
  { chain: 'optimism', address: '0x5421FA1A48f9FF81e4580557E86C7C0D24C18036' },
]

const farmStakings: Contract[] = [{ chain: 'optimism', address: '0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2' }]

const locker: Contract = {
  chain: 'optimism',
  address: '0x43d2761ed16c89a2c4342e2b16a3c61ccf88f05b',
  decimals: 18,
  symbol: 'veSTG',
  underlyings: ['0x296f55f8fb28e498b858d0bcda06d955b2cb3f97'],
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
    locker: (...args) => getSingleLockerBalance(...args, OP, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

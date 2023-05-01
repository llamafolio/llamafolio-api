import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'avalanche',
  address: '0x1f1e7c893855525b303f99bdf5c3c05be09ca251',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'avalanche',
  address: '0x3a01521F8E7F012eB37eAAf1cb9490a5d9e18249',
  pool: [
    '0xF44938b0125A6662f9536281aD2CD6c499F22004',
    '0xED2a7edd7413021d440b09D654f3b87712abAB66',
    '0x77a7e60555bC18B4Be44C181b2575eee46212d44',
  ],
  rewards: [SYN],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSynapseContracts(ctx, miniChef)

  return {
    contracts: { miniChef, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSynapseBalances(...args, miniChef),
  })

  return {
    groups: [{ balances }],
  }
}

import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'polygon',
  address: '0xf8f9efc0db77d8881500bb06ff5d6abc3070e695',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'polygon',
  address: '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5',
  pool: ['0x96cf323E477Ec1E17A4197Bdcc6f72Bb2502756a', '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5'],
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

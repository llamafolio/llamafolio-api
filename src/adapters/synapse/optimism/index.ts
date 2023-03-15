import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'optimism',
  address: '0x5A5fFf6F753d7C11A56A52FE47a177a87e431655',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'optimism',
  address: '0xe8c610fcb63A4974F02Da52f0B4523937012Aaa0',
  pool: ['0xE27BFf97CE92C3e1Ff7AA9f86781FDd6D48F5eE9', '0xF44938b0125A6662f9536281aD2CD6c499F22004'],
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

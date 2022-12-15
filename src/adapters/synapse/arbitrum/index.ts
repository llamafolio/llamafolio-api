import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseBalances, getSynapseContract } from '../common/balance'

const SYN: Token = {
  chain: 'arbitrum',
  address: '0x080f6aed32fc474dd5717105dba5ea57268f46eb',
  symbol: 'SYN',
  decimals: 18,
}

const MiniChef: Contract = {
  chain: 'arbitrum',
  address: '0x73186f2Cf2493f20836b17b21ae79fc12934E207',
  rewards: [SYN],
}

export const getContracts = async () => {
  const synapse = await getSynapseContract('arbitrum', MiniChef)

  return {
    contracts: { synapse, MiniChef },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'arbitrum', contracts, {
    synapse: (...args) => getSynapseBalances(...args, MiniChef),
  })

  console.log(balances)

  return {
    balances,
  }
}

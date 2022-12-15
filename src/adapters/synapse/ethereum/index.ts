import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseBalances, getSynapseContract } from '../common/balance'

const SYN: Token = {
  chain: 'ethereum',
  address: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
  symbol: 'SYN',
  decimals: 18,
}

const MiniChef: Contract = {
  chain: 'ethereum',
  address: '0xd10eF2A513cEE0Db54E959eF16cAc711470B62cF',
  rewards: [SYN],
}

export const getContracts = async () => {
  const synapse = await getSynapseContract('ethereum', MiniChef)

  return {
    contracts: { synapse, MiniChef },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    synapse: (...args) => getSynapseBalances(...args, MiniChef),
  })

  return {
    balances,
  }
}

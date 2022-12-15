import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseBalances, getSynapseContract } from '../common/balance'

const SYN: Token = {
  chain: 'avax',
  address: '0x1f1E7c893855525b303f99bDF5c3c05Be09ca251',
  symbol: 'SYN',
  decimals: 18,
}

const MiniChef: Contract = {
  chain: 'avax',
  address: '0x3a01521F8E7F012eB37eAAf1cb9490a5d9e18249',
  rewards: [SYN],
}

export const getContracts = async () => {
  const synapse = await getSynapseContract('avax', MiniChef)

  return {
    contracts: { synapse, MiniChef },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'avax', contracts, {
    synapse: (...args) => getSynapseBalances(...args, MiniChef),
  })

  console.log(balances)

  return {
    balances,
  }
}

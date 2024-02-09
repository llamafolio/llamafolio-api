import { getPerennialStakeBalances } from '@adapters/perennial/arbitrum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPVAFarmBalances } from './farm'

const PVA: Contract = {
  chain: 'arbitrum',
  address: '0x5a572b5fbbc43387b5ef8de2c4728a4108ef24a6',
  underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  decimals: 18,
  symbol: 'PVA',
}

const vault_aster: Contract = {
  chain: 'arbitrum',
  address: '0xf8b6010fd6ba8f3e52c943a1473b1b1459a73094',
  token: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
}

const vault_begonia: Contract = {
  chain: 'arbitrum',
  address: '0x699e37dfcee5c6e4c5d0bc1c2ffbc2afec55f6fb',
  token: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
}

export const getContracts = () => {
  return {
    contracts: { PVA, stakers: [vault_aster, vault_begonia] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    PVA: getPVAFarmBalances,
    stakers: getPerennialStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

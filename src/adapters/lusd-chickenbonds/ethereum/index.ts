import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getActiveBondsBalances } from './bondNFT'
import { getBondNFTContract } from './chickenBondManager'

export const getContracts = async () => {
  const bondNFT = await getBondNFTContract()

  return {
    contracts: { bondNFT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    bondNFT: getActiveBondsBalances,
  })

  return {
    balances,
  }
}

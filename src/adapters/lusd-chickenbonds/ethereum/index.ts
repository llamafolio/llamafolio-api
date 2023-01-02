import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getActiveBondsBalances } from './bondNFT'
import { chickenBondManager, getBondNFTContract } from './chickenBondManager'

export const getContracts = async (ctx: BaseContext) => {
  const bondNFT = await getBondNFTContract(ctx)

  return {
    contracts: { chickenBondManager },
    props: { bondNFT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts, props) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    chickenBondManager: (ctx) => getActiveBondsBalances(ctx, props.bondNFT),
  })

  return {
    balances,
  }
}

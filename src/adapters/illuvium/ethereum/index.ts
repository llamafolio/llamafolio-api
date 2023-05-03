import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getILVBalances } from './balance'
import { getILVContracts } from './contract'

export interface IPools {
  address: string
  provider: string
  staker: string
}

const pools: IPools[] = [
  {
    // ILV
    address: '0x7f5f854ffb6b7701540a00c69c4ab2de2b34291d',
    staker: '0x25121EDDf746c884ddE4619b573A7B10714E2a36',
    provider: 'illuvium',
  },
  {
    // ILV-ETH
    address: '0xe98477bdc16126bb0877c6e3882e3edd72571cc2',
    staker: '0x8B4d8443a0229349A9892D4F7CbE89eF5f843F72',
    provider: 'sushi',
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getILVContracts(ctx, pools)

  return {
    contracts: { contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getILVBalances,
  })

  return {
    groups: [{ balances }],
  }
}

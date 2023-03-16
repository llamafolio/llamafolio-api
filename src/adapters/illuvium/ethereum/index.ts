import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getILVBalances } from './balance'
import { getILVContracts } from './contract'

export interface IPools {
  address: string
  provider: string
}

const pools: IPools[] = [
  { address: '0x7f5f854ffb6b7701540a00c69c4ab2de2b34291d', provider: 'illuvium' }, // ILV
  { address: '0x25121EDDf746c884ddE4619b573A7B10714E2a36', provider: 'illuvium' }, // ILV
  { address: '0xe98477bdc16126bb0877c6e3882e3edd72571cc2', provider: 'sushi' }, // ILV-ETH
  { address: '0x8B4d8443a0229349A9892D4F7CbE89eF5f843F72', provider: 'sushi' }, // ILV-ETH
  { address: '0xc759c6233e9c1095328d29cfff319780b28cecd8', provider: 'illuvium' }, // LINK
  { address: '0x099a3b242dcec87e729cefc6157632d7d5f1c4ef', provider: 'illuvium' }, // AXS
  { address: '0x4c6997d462b0146fa54b747065411c1ba0248595', provider: 'xyz' }, // ILV-XYZ
  { address: '0x9898d72c2901d09e72a426d1c24b6ab90eb100e7', provider: 'illuvium' }, // SNX
  { address: '0x9cc7683e873712f243437577da2969aeabe0081e', provider: 'illuvium' }, // XYZ
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

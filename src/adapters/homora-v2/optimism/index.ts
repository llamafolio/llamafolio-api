import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getHomoraBalances } from '../common/balance'
import { getPoolsContract } from '../common/contract'

const pools = [
  '0x14bC6Cf95a8BEFD4B07e0f824c60bC1401fE9D23', // WETH
  '0xbCb8b7Ce255aD6268924407342b78c065Df5986d', // DAI
  '0x080a165204Af7665dc980BD093125125A2Bca375', // USDC
  '0x3405163D6aaA6A80E210a568c06210D5B1925D2d', // OP
]

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getPoolsContract(ctx, pools)

  return {
    contracts: { contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getHomoraBalances,
  })

  return {
    groups: [{ balances }],
  }
}

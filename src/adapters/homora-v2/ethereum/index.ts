import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getHomoraBalances } from '../common/balance'
import { getPoolsContract } from '../common/contract'

const pools = [
  '0xeEa3311250FE4c3268F8E684f7C87A82fF183Ec1', // ETH
  '0xee8389d235E092b2945fE363e97CDBeD121A0439', // DAI
  '0x020eDC614187F9937A1EfEeE007656C6356Fb13A', // USDT
  '0x08bd64BFC832F1C2B3e07e634934453bA7Fa2db2', // USDC
  '0xe52557bf7315Fd5b38ac0ff61304cb33BB973603', // YFI
  '0xd80CE6816f263C3cA551558b2034B61bc9852b97', // DPI
  '0x4d38b1ac1fad488e22282db451613EDd10434bdC', // SNX
  '0x8897cA3e1B9BC5D5D715b653f186Cc7767bD4c66', // USD
  '0xb59Ecdf6C2AEA5E67FaFbAf912B26658d43295Ed', // LINK
  '0xE520679df7E32600D9B2Caf50bD5a4337ea3CF89', // WBTC
  '0x6cdd8cBcFfB3821bE459f6fCaC647a447E56c999', // UNI
  '0x2ABBA23Bdc48245f5F68661E390da243755B569f', // SUSHI
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

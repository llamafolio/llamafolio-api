import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const staker: Contract = {
  chain: 'polygon',
  address: '0xc022ca2f81a00d2dc50d35a4d9e307d5efe8535e',
  underlyings: ['0x62f594339830b90ae4c084ae7d223ffafd9658a7'],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

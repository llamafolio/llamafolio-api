import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xba91ffd8a2b9f68231eca6af51623b3433a89b13',
  token: '0x4691937a7508860F876c9c0a2a617E7d9E945D4B',
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getWoofiStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

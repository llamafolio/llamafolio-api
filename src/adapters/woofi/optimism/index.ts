import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'optimism',
  address: '0xba91ffd8a2b9f68231eca6af51623b3433a89b13',
  token: '0x871f2f2ff935fd1ed867842ff2a7bfd051a5e527',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getWoofiContracts(ctx)

  return {
    contracts: { staker, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getWoofiStakeBalance,
    pools: getWoofiBalances,
  })

  return {
    groups: [{ balances }],
  }
}

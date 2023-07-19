import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const superChargers: Contract[] = [
  {
    chain: 'polygon',
    address: '0x9bcf8b0b62f220f3900e2dc42deb85c3f79b405b',
    underlyings: ['0x1b815d120b3ef02039ee11dc2d33de7aa4a8c603'],
  },
]

const staker: Contract = {
  chain: 'polygon',
  address: '0xba91ffd8a2b9f68231eca6af51623b3433a89b13',
  token: '0x1b815d120b3ef02039ee11dc2d33de7aa4a8c603',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getWoofiContracts(ctx)

  return {
    contracts: { staker, pools: [...pools, ...superChargers] },
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

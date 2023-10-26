import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const superChargers: Contract[] = [
  {
    chain: 'bsc',
    address: '0x2AEab1a338bCB1758f71BD5aF40637cEE2085076',
    underlyings: ['0x4691937a7508860f876c9c0a2a617e7d9e945d4b'],
  },
]

const staker: Contract = {
  chain: 'bsc',
  address: '0xba91ffd8a2b9f68231eca6af51623b3433a89b13',
  token: '0x4691937a7508860f876c9c0a2a617e7d9e945d4b',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getWoofiContracts(ctx)

  return {
    contracts: { staker, pools: [...pools, ...superChargers] },
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

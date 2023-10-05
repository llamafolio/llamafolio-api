import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const superChargers: Contract[] = [
  {
    chain: 'fantom',
    address: '0x2fe5e5d341cffa606a5d9da1b6b646a381b0f7ec',
    underlyings: ['0x6626c47c00f1d87902fc13eecfac3ed06d5e8d8a'],
  },
]

const staker: Contract = {
  chain: 'fantom',
  address: '0x1416e1378682b5ca53f76656549f7570ad0703d9',
  token: '0x6626c47c00f1d87902fc13eecfac3ed06d5e8d8a',
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

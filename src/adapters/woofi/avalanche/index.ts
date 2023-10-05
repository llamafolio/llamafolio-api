import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const superChargers: Contract[] = [
  {
    chain: 'avalanche',
    address: '0xcd1b9810872aec66d450c761e93638fb9fe09db0',
    underlyings: ['0xabc9547b534519ff73921b1fba6e672b5f58d083'],
  },
]

const staker: Contract = {
  chain: 'avalanche',
  address: '0x3bd96847c40de8b0f20da32568bd15462c1386e3',
  token: '0xabc9547b534519ff73921b1fba6e672b5f58d083',
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

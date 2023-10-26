import { getWoofiContracts } from '@adapters/woofi/common/contract'
import { getWoofiBalances } from '@adapters/woofi/common/farm'
import { getWoofiStakeBalance } from '@adapters/woofi/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const superChargers: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x9321785D257b3f0eF7Ff75436a87141C683DC99d',
    underlyings: ['0xcafcd85d8ca7ad1e1c6f82f651fa15e33aefd07b'],
  },
]

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x2cfa72e7f58dc82b990529450ffa83791db7d8e2',
  token: '0xcafcd85d8ca7ad1e1c6f82f651fa15e33aefd07b',
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

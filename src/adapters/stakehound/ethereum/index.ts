import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

const stETH: Token = {
  chain: 'ethereum',
  address: '0xDFe66B14D37C77F4E9b180cEb433d1b164f0281D',
  name: 'StakedTokenV2',
  symbol: 'stETH',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { stETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stETH: async (ctx, stETH) => {
      const { erc20 } = await getBalancesOf(ctx, [stETH])
      return erc20
    },
  })

  return {
    groups: [{ balances }],
  }
}

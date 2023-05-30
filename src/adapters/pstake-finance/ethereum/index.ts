import { getpStakeETHBalance } from '@adapters/pstake-finance/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stkETH: Contract = {
  chain: 'ethereum',
  address: '0x2c5bcad9ade17428874855913def0a02d8be2324',
  decimals: 18,
  symbol: 'stkETH',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { stkETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stkETH: getpStakeETHBalance,
  })

  return {
    groups: [{ balances }],
  }
}

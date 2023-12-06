import { getsafETHBalance } from '@adapters/asymmetry-finance/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const safETH: Contract = {
  chain: 'ethereum',
  address: '0x6732efaf6f39926346bef8b821a04b6361c4f3e5',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { safETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    safETH: getsafETHBalance,
  })

  return {
    groups: [{ balances }],
  }
}

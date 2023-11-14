import type { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const cbETH: Token = {
  chain: 'arbitrum',
  address: '0x1debd73e752beaf79865fd6446b0c970eae7732f',
  name: 'Coinbase Wrapped Staked ETH',
  symbol: 'CBETH',
  decimals: 18,
}

export const getContracts = async () => {
  return {
    contracts: { cbETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    cbETH: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

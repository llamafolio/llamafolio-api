import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const ezETH: Contract = {
  chain: 'ethereum',
  address: '0xbf5495efe5db9ce00f80364c8b423567e58d2110',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

export const getContracts = () => {
  return {
    contracts: { ezETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ezETH: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1702944000,
}

import { getsARPABalance } from '@adapters/arpa-staking/ethereum/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sARPA: Contract = {
  chain: 'ethereum',
  address: '0xee710f79aa85099e200be4d40cdf1bfb2b467a01',
  token: '0xBA50933C268F567BDC86E1aC131BE072C6B0b71a',
}

export const getContracts = async (ctx: BaseContext) => {
  return {
    contracts: { sARPA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sARPA: getsARPABalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1688428800,
}

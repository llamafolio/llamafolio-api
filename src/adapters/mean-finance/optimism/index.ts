import { getMeanFinanceBalances } from '@adapters/mean-finance/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const persmissionManager: Contract = {
  chain: 'optimism',
  address: '0x20bdAE1413659f47416f769a4B27044946bc9923',
}

export const getContracts = () => {
  return {
    contracts: { persmissionManager },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    persmissionManager: getMeanFinanceBalances,
  })

  return {
    groups: [{ balances }],
  }
}

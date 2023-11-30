import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const OUSG: Contract = {
  chain: 'polygon',
  address: '0xba11c5effa33c4d6f8f593cfa394241cfe925811',
}

export const getContracts = () => {
  return {
    contracts: { OUSG },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    OUSG: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

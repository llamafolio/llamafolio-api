import { getBlastDepositBalances } from '@adapters/blast/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x5f6ae08b8aeb7078cf2f96afb089d7c9f51da47d',
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getBlastDepositBalances,
  })

  return {
    groups: [{ balances }],
  }
}

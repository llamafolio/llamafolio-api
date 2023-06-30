import { getRaftBalance } from '@adapters/raft/ethereum/balance'
import { getRaftContracts } from '@adapters/raft/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const positionManager: Contract = {
  chain: 'ethereum',
  address: '0x5F59b322eB3e16A0C78846195af1F588b77403FC',
}

export const getContracts = async (ctx: BaseContext) => {
  const pool = await getRaftContracts(ctx, positionManager)

  return {
    contracts: { pool },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pool: getRaftBalance,
  })

  return {
    groups: [{ balances }],
  }
}

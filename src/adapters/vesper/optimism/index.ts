import { getVesperStakeBalances } from '@adapters/vesper/common/balance'
import { getVesperStakeContracts } from '@adapters/vesper/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const STAKING_URL = 'https://api-optimism.vesper.finance/pools'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getVesperStakeContracts(ctx, STAKING_URL)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getVesperStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1684800000,
}

import { getDefinitiveBalances } from '@adapters/definitive.fi/common/balance'
import { getDefinitiveContracts } from '@adapters/definitive.fi/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x954F286AEc288af89601F53e5D8727540ba2f00f',
  '0x4184a083307a208f5bF20d0B44E161Bc55aae996',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getDefinitiveContracts(ctx, poolAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getDefinitiveBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709769600,
}

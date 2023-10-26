import { getPendleBalances } from '@adapters/pendle/common/balance'
import { getPendleLockerBalance } from '@adapters/pendle/common/locker'
import { getPendlePools } from '@adapters/pendle/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locker: Contract = {
  chain: 'ethereum',
  address: '0x4f30a9d41b80ecc5b94306ab4364951ae3170210',
  token: '0x808507121B80c02388fAd14726482e061B8da827',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPendlePools(ctx)

  return {
    contracts: { pools, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPendleBalances,
    locker: getPendleLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}

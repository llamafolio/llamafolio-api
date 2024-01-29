import { getVelodromeBalances } from '@adapters/velodrome-v2/optimism/balance'
import { getLockerFeesBribesBalances } from '@adapters/velodrome-v2/optimism/locker'
import { getVelodromePairsContracts } from '@adapters/velodrome-v2/optimism/pair'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const AERO: Token = {
  chain: 'base',
  address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
  decimals: 18,
  symbol: 'AERO',
}

const factory: Contract = {
  chain: 'base',
  address: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
}

const voter: Contract = {
  chain: 'base',
  address: '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5',
}

const locker: Contract = {
  chain: 'base',
  address: '0xebf418fe2512e7e6bd9b87a8f0f294acdc67e6b4',
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getVelodromePairsContracts(ctx, factory, voter)

  const lockerWithBribesAndFees = { ...locker, pairs }

  return {
    contracts: { pairs, lockerWithBribesAndFees },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getVelodromeBalances(...args, AERO),
    lockerWithBribesAndFees: (...args) => getLockerFeesBribesBalances(...args, AERO),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1693267200,
}

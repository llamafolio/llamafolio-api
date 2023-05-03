import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

import { getVaultsBalances, getVaultsContracts } from '../common/vaults'

const YFI: Contract = {
  chain: 'ethereum',
  address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
  decimals: 18,
  symbol: 'YFI',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x90c1f9220d90d3966fbee24045edd73e1d588ad5',
  decimals: 18,
  symbol: 'veYFI',
}

const registryAdapter: Contract = {
  name: 'Registery Adapter V2 Vaults',
  chain: 'ethereum',
  address: '0x240315db938d44bb124ae619f5Fd0269A02d1271',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getVaultsContracts(ctx, registryAdapter)

  return {
    contracts: { vaults, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: (...args) => getVaultsBalances(...args, registryAdapter),
    locker: (...args) => getSingleLockerBalance(...args, YFI, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

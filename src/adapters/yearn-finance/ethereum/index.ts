import { getYearnBalances, getYearnStakeBalance } from '@adapters/yearn-finance/common/balance'
import { getYearnVaults } from '@adapters/yearn-finance/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { getSingleStakeBalance } from '@lib/stake'

const yETH: Contract = {
  chain: 'ethereum',
  address: '0x1bed97cbc3c24a4fb5c069c6e311a967386131f7',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const styETH: Contract = {
  chain: 'ethereum',
  address: '0x583019ff0f430721ada9cfb4fac8f06ca104d0b4',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

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

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getYearnVaults(ctx)

  return {
    contracts: { vaults, locker, yETH, styETH },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getSingleLockerBalance(...args, YFI, 'locked'),
    vaults: getYearnBalances,
    yETH: getSingleStakeBalance,
    styETH: getYearnStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { Token } from '@lib/token'

import { getAnglePoolsBalances, getStablePoolBalancesFromAPI } from '../common/balance'
import { getAnglePoolsContract, getStablePoolContractsFromAPI } from '../common/contract'

const angle: Token = {
  chain: 'ethereum',
  address: '0x31429d1856aD1377A8A0079410B297e1a9e214c2',
  decimals: 18,
  symbol: 'ANGLE',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x0C462Dbb9EC8cD1630f1728B2CFD2769d09f0dd5',
  decimals: 18,
  underlyings: [angle],
  symbol: 'veAngle',
}

const poolsAddresses: Record<string, string[]> = {
  swap: ['0xBa625B318483516F7483DD2c4706aC92d44dBB2B', '0xd6282C5aEAaD4d776B932451C44b8EB453E44244'],
  gelato: ['0xEB7547a8a734b6fdDBB8Ce0C314a9E6485100a3C', '0x3785Ce82be62a342052b9E5431e9D3a839cfB581'],
}
export const getContracts = async (ctx: BaseContext) => {
  const [stablePools, pools] = await Promise.all([
    getStablePoolContractsFromAPI(ctx, 1),
    getAnglePoolsContract(ctx, poolsAddresses),
  ])

  return {
    contracts: { stablePools, locker, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stablePools: (...args) => getStablePoolBalancesFromAPI(...args, 1),
    pools: getAnglePoolsBalances,
    locker: (...args) => getSingleLockerBalance(...args, angle, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

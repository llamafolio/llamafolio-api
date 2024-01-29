import { getLendContracts, getPaladinPodsBalances } from '@adapters/paladin-finance/ethereum/lend'
import { getPaladinContracts } from '@adapters/paladin-finance/ethereum/pool'
import {
  gethPalBalances,
  getPaladinStakeBalances,
  getPaladinStakeBalancesFromdstkAave,
} from '@adapters/paladin-finance/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0x241326339ced11ecc7ca07e4aa350234c57f53e5',
}

const poolProvider: Contract = {
  chain: 'ethereum',
  address: '0xf3decc68c4ff828456696287b12e5ac0fa62fe56',
}

const hPAL: Contract = {
  chain: 'ethereum',
  address: '0x624d822934e87d3534e435b83ff5c19769efd9f6',
  underlyings: ['0xab846fb6c81370327e784ae7cbb6d6a6af6ff4bf'],
}

const dstkAave: Contract = {
  chain: 'ethereum',
  address: '0x167c606be99dbf5a8af61e1983e5b309e8fa2ae7',
  token: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
}

const stakeFromdstkAave: Contract = {
  chain: 'ethereum',
  address: '0x990f58570b4c7b8b7ae3bc28efeb2724be111545',
  token: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, pods] = await Promise.all([getPaladinContracts(ctx, comptroller), getLendContracts(ctx, poolProvider)])

  return {
    contracts: { pools, hPAL, pods, dstkAave, stakeFromdstkAave },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getPaladinStakeBalances,
    hPAL: gethPalBalances,
    pods: getPaladinPodsBalances,
    dstkAave: getSingleStakeBalance,
    stakeFromdstkAave: getPaladinStakeBalancesFromdstkAave,
  })

  return {
    groups: [{ balances }],
  }
}

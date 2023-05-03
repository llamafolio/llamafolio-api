import type { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getERC20BalanceOf } from '@lib/erc20'
import type { Token } from '@lib/token'

import { getFarmBalances, getLockerBalances, getStakeBalances } from './balance'
import { getPlatypusContract } from './contract'

const PTP: Token = {
  chain: 'avalanche',
  address: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
  decimals: 18,
  symbol: 'PTP',
}

const vePTP: Contract = {
  chain: 'avalanche',
  address: '0x5857019c749147eee22b1fe63500f237f3c1b692',
  decimals: 18,
  symbol: 'vePTP',
  underlyings: [PTP],
}

const masterPlatypus: Contract = {
  chain: 'avalanche',
  address: '0xfF6934aAC9C94E1C39358D4fDCF70aeca77D0AB0',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPlatypusContract(ctx, masterPlatypus)

  return {
    contracts: { masterPlatypus, pools, vePTP },
  }
}

const getPlatypusPoolBalances = async (ctx: BalancesContext, pools: Contract[], contract: Contract) => {
  const [lpRes, farmRes] = await Promise.all([
    (await getERC20BalanceOf(ctx, pools as Token[])).map((res) => ({ ...res, category: 'lp', rewards: undefined })),
    getFarmBalances(ctx, pools, contract),
  ])

  return [...(lpRes as Balance[]), ...farmRes]
}

const getPlatypusContractsBalances = async (ctx: BalancesContext, contract: Contract) => {
  return Promise.all([getLockerBalances(ctx, contract), getStakeBalances(ctx, contract)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getPlatypusPoolBalances(...args, masterPlatypus),
    vePTP: getPlatypusContractsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

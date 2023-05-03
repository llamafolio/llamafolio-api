import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getFarmLPContracts } from '../common/contract'
import { getFarmBalances } from '../common/farm'
import { getLockerBalance } from '../common/locker'

const RBN: Token = {
  chain: 'ethereum',
  address: '0x6123B0049F904d730dB3C36a31167D9d4121fA6B',
  decimals: 18,
  symbol: 'RBN',
}

const veRBN: Contract = {
  chain: 'ethereum',
  name: 'Vote-escrowed RBN',
  address: '0x19854C9A5fFa8116f48f984bDF946fB9CEa9B5f7',
  decimals: 18,
  symbol: 'veRBN',
  underlyings: [RBN],
}

const veRBNPenaltyRewards: Contract = {
  chain: 'ethereum',
  name: 'Vote-escrowed RBN Penalty Rewards',
  address: '0x43277C92F9936aeb5d6A2713a44Cd2f096f171cC',
  underlyings: [RBN],
}

const gaugeController: Contract = {
  chain: 'ethereum',
  address: '0x0cb9cc35cEFa5622E8d25aF36dD56DE142eF6415',
}

export const getContracts = async (ctx: BaseContext) => {
  const gauges = await getFarmLPContracts(ctx, gaugeController)

  return {
    contracts: { veRBN, veRBNPenaltyRewards, gauges },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veRBN: (...args) => getLockerBalance(...args, veRBNPenaltyRewards),
    gauges: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

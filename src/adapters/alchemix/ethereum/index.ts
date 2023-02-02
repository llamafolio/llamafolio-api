import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getTransmutationBalances } from './transmuter'

const alUSD: Token = {
  chain: 'ethereum',
  address: '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9',
  decimals: 18,
  symbol: 'alUSD',
}

const alETH: Token = {
  chain: 'ethereum',
  address: '0x0100546F2cD4C9D97f798fFC9755E47865FF7Ee6',
  decimals: 18,
  symbol: 'alETH',
}

const alUSDtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd',
  underlyings: [alUSD],
}

const alETHtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c',
  underlyings: [alETH],
}

const transmuters = [alUSDtransmuter, alETHtransmuter]

export const getContracts = () => {
  return {
    contracts: { transmuters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    transmuters: getTransmutationBalances,
  })

  return {
    balances,
  }
}

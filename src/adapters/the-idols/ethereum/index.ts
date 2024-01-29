import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getVirtueStakeBalances } from './stake'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x0dd5a35fe4cd65fe7928c7b923902b43d6ea29e7',
  token: '0x9416bA76e88D873050A06e5956A3EBF10386b863',
  rewarder: '0xC73B93885F10c5eAf8Cb126495bBD14D3B9b7BaF',
  rewards: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getVirtueStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1648684800,
}

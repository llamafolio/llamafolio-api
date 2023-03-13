import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMultiBalances } from '../common/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xbba4115ecb1f811061ecb5a8dc8fcdee2748ceba',
  decimals: 18,
  underlyings: ['0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4'],
  symbol: 'veMULTI',
}

export const getContracts = async () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getMultiBalances,
  })

  return {
    groups: [{ balances }],
  }
}

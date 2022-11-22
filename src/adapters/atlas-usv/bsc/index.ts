import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakeBalance } from '../common/stake'

const USV: Token = {
  chain: 'bsc',
  address: '0xaf6162DC717CFC8818eFC8d6f46a41Cf7042fCBA',
  symbol: 'USV',
  decimals: 9,
}

const sUSV: Contract = {
  name: 'Staked Universal Store of Value',
  chain: 'bsc',
  address: '0x238A7349A4815604D33665684E3D41E5E00AA015',
  symbol: 'sUSV',
  decimals: 9,
  underlyings: [USV],
}

export const getContracts = () => {
  return {
    contracts: { sUSV },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, {
    sUSV: getStakeBalance,
  })

  return {
    balances,
  }
}

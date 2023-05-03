import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from '../common/stake'

const LF: Contract = {
  name: 'Life',
  chain: 'avalanche',
  address: '0x5684a087C739A2e845F4AaAaBf4FBd261edc2bE8',
  symbol: 'LF',
  decimals: 9,
}

const sLF: Contract = {
  name: 'sLife',
  chain: 'avalanche',
  address: '0x769F19A9A449E523fC1F1f7B73051B3bC3C52738',
  symbol: 'sLF',
  decimals: 9,
  underlyings: [LF],
}

export const getContracts = () => {
  return {
    contracts: { sLF },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sLF: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

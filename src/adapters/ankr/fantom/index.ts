import { getStakeBalance } from '@adapters/ankr/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ankrFTM: Contract = {
  chain: 'fantom',
  address: '0xcfc785741dc0e98ad4c9f6394bb9d43cd1ef5179',
  underlyings: ['0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'],
}

export const getContracts = () => {
  return {
    contracts: { ankrFTM },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ankrFTM: getStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

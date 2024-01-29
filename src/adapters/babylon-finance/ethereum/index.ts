import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getBabylonBalances } from './balance'
import { getBabylonContracts } from './contract'

const pools: `0x${string}`[] = [
  '0xb5bd20248cfe9480487cc0de0d72d0e19ee0acb6',
  '0xd42b3a30ca89155d6c3499c81f0c4e5a978be5c2',
  '0x1d50c4f18d7af4fce2ea93c7942aae6260788596',
  '0x8174e96f7f7e14b252f20de1e5f932cb5a1a911c',
  '0x3eec6ac8675ab1b4768f6032f0598e36ac64f415',
  '0x055f3b13512817db9e3b43e88778c9d623bd7d22',
  '0xa4e524391a878346a168aabfa984b9b8f94a3db4',
  '0xaa2d49a1d66a58b8dd0687e730fefc2823649791',
]

export const getContracts = async (ctx: BaseContext) => {
  const stakers = await getBabylonContracts(ctx, pools)

  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getBabylonBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1637193600,
}

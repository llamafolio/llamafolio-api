import { getCowRewardBalance, getCowVestingBalance } from '@adapters/cow-swap/common/vest'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const veCOW: Contract = {
  chain: 'gnosis',
  address: '0xc20c9c13e853fc64d054b73ff21d3636b2d97eab',
  token: '0x177127622c4a00f3d409b75571e12cb3c8973d3c',
}

const rewarder: Contract = {
  chain: 'gnosis',
  address: '0x3d610e917130f9d036e85a030596807f57e11093',
  token: '0x177127622c4a00f3d409b75571e12cb3c8973d3c',
}

export const getContracts = () => {
  return {
    contracts: { veCOW, rewarder },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veCOW: getCowVestingBalance,
    rewarder: getCowRewardBalance,
  })

  return {
    groups: [{ balances }],
  }
}

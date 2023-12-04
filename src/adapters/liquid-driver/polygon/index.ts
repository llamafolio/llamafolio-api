import { getLiquidDriverShadowBalances } from '@adapters/liquid-driver/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const liveRetroChef: Contract = {
  chain: 'polygon',
  address: '0x1de28cb80428c265e7f40a05066b68c31e8d7d0e',
  token: '0xCaAF554900E33ae5DBc66ae9f8ADc3049B7D31dB',
  rewards: ['0xCaAF554900E33ae5DBc66ae9f8ADc3049B7D31dB'],
}

export const getContracts = () => {
  return {
    contracts: { shadowFarms: [liveRetroChef] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    shadowFarms: getLiquidDriverShadowBalances,
  })

  return {
    groups: [{ balances }],
  }
}

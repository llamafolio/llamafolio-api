import { getMerlinReStaker, getMerlinStaker } from '@adapters/merlins-seal/common/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const reStaker: Contract = {
  chain: 'ethereum',
  address: '0xc40329d3ae56af6b0757c3fe53941ddcc3d92671',
  token: '0x7122985656e38bdc0302db86685bb972b145bd3c',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x8bb6cae3f1cada07dd14ba951e02886ea6bba183',
  underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
}

export const getContracts = () => {
  return {
    contracts: { reStaker, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    reStaker: getMerlinReStaker,
    staker: getMerlinStaker,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1707696000,
}

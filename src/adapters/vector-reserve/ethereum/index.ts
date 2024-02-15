import { getVectorReserveBalance } from '@adapters/vector-reserve/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const sVEC: Contract = {
  chain: 'ethereum',
  address: '0x66d5c66e7c83e0682d947176534242c9f19b3365',
  underlyings: ['0x1bb9b64927e0c5e207c9db4093b3738eef5d8447'],
  decimals: 9,
  symbol: 'VEC',
}

const vETH: Contract = {
  chain: 'ethereum',
  address: '0x38d64ce1bdf1a9f24e0ec469c9cade61236fb4a0',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  decimals: 18,
  symbol: 'vETH',
}

const svETH: Contract = {
  chain: 'ethereum',
  address: '0x6733f0283711f225a447e759d859a70b0c0fd2bc',
  token: '0x38d64ce1bdf1a9f24e0ec469c9cade61236fb4a0',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  decimals: 18,
  symbol: 'svETH',
}

export const getContracts = () => {
  return {
    contracts: { sVEC, vETH, svETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sVEC: getSingleStakeBalance,
    vETH: getSingleStakeBalance,
    svETH: getVectorReserveBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706745600,
}

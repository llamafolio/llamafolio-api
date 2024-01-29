import { getSmoothyStakeBalances } from '@adapters/smoothy/common/stake'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const tokens: string[] = [
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0x6b175474e89094c44da98b954eedeac495271d0f',
  '0x0000000000085d4780B73119b644AE5ecd22b376',
  '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
  '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
  '0x1456688345527bE1f37E9e627DA0837D6f08C925',
  '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
]

const staker: Contract = {
  chain: 'ethereum',
  address: '0xe5859f4efc09027a9b718781dcb2c6910cac6e91',
  decimals: 18,
  underlyings: tokens,
  symbol: 'syUSD',
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getSmoothyStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1615762800,
}

import type { AdapterConfig } from "@lib/adapter";import { getSmoothyStakeBalances } from '@adapters/smoothy/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const tokens: `0x${string}`[] = [
  '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  '0x55d398326f99059ff775485246999027b3197955',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
  '0xb9fd14912cd2ff2f0d6d3c2b46ddc73705d77d3c',
  '0x9bb6128e20cf5496cf4db5f827f6d951be63d503',
]

const staker: Contract = {
  chain: 'bsc',
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
                    startDate: 1652400000,
                  }
                  
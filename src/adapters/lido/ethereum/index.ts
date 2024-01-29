import type { AdapterConfig } from "@lib/adapter";import { getUnstakeLidoBalances } from '@adapters/lido/ethereum/unstake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

const nftUnstaking: Contract = {
  chain: 'ethereum',
  address: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
  token: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
}

const stETH: Contract = {
  name: 'stETH',
  displayName: 'Liquid staked Ether 2.0',
  chain: 'ethereum',
  address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
  symbol: 'stETH',
  decimals: 18,
  coingeckoId: 'staked-ether',
}

const wstETH: Contract = {
  name: 'wstETH',
  displayName: 'Wrapped liquid staked Ether 2.0',
  chain: 'ethereum',
  address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  symbol: 'wstETH',
  decimals: 18,
  coingeckoId: 'wrapped-steth',
}

const stMATIC: Contract = {
  chain: 'ethereum',
  address: '0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599',
  name: 'Staked MATIC',
  symbol: 'stMATIC',
  decimals: 18,
  coingeckoId: 'lido-staked-matic',
}

export const getContracts = () => {
  return {
    contracts: {
      stakers: [stETH, wstETH, stMATIC],
      nftUnstaking,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSingleStakeBalances,
    nftUnstaking: getUnstakeLidoBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1608418800,
                  }
                  
import type { AdapterConfig } from "@lib/adapter";import { getRetroBalances } from '@adapters/retro/polygon/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const RETRO: Token = {
  chain: 'polygon',
  address: '0xbfa35599c7aebb0dace9b5aa3ca5f2a79624d8eb',
  decimals: 18,
  symbol: 'RETRO',
}

const locker: Contract = {
  chain: 'polygon',
  address: '0xb419ce2ea99f356bae0cac47282b9409e38200fa',
}

export const factory: Contract = {
  chain: 'ethereum',
  address: '0x91e1b99072f238352f59e58de875691e20dc19c1',
}

export const nonFungiblePositionManager: Contract = {
  chain: 'ethereum',
  address: '0x8aac493fd8c78536ef193882aeffeaa3e0b8b5c5',
}

export const getContracts = async () => {
  return {
    contracts: { nonFungiblePositionManager, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nonFungiblePositionManager: (...args) => getRetroBalances(...args, factory),
    locker: (...args) => getNFTLockerBalances(...args, RETRO, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1690675200,
                  }
                  
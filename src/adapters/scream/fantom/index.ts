import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

import { getScreamStakeBalances } from './stake'

const SCREAM: Token = {
  chain: 'fantom',
  address: '0xe0654c8e6fd4d733349ac7e09f6f23da256bf475',
  decimals: 18,
  symbol: 'SCREAM',
}

const xSCREAM: Contract = {
  chain: 'fantom',
  address: '0xe3d17c7e840ec140a7a51aca351a482231760824',
  symbol: 'xSCREAM',
  decimals: 18,
  underlyings: ['0xe0654c8e6fd4d733349ac7e09f6f23da256bf475'],
}

const locker: Contract = {
  chain: 'fantom',
  address: '0x4615977309fcb119ac538c413155536203e4ac68',
  symbol: 'veSCREAM',
  decimals: 18,
  underlyings: ['0xe0654c8e6fd4d733349ac7e09f6f23da256bf475'],
}

const comptroller: Contract = {
  chain: 'fantom',
  address: '0x260e596dabe3afc463e75b6cc05d8c46acacfb09',
}

const comptroller_v1: Contract = {
  chain: 'fantom',
  address: '0x3d3094aec3b63c744b9fe56397d36be568faebdf',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, markets_v1] = await Promise.all([
    getMarketsContracts(ctx, {
      // Scream Unitroller
      comptrollerAddress: comptroller.address,
    }),
    getMarketsContracts(ctx, {
      // Scream Unitroller
      comptrollerAddress: comptroller_v1.address,
    }),
  ])

  return {
    contracts: { markets, markets_v1, locker, xSCREAM },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    markets_v1: getMarketsBalances,
    locker: (...args) => getSingleLockerBalance(...args, SCREAM, 'locked'),
    xSCREAM: getScreamStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1626480000,
                  }
                  
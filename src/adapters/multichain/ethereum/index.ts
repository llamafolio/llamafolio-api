import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'

const MULTI: Contract = {
  chain: 'ethereum',
  address: '0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4',
  decimals: 18,
  symbol: 'MULTI',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xbba4115ecb1f811061ecb5a8dc8fcdee2748ceba',
  decimals: 18,
  underlyings: ['0x65Ef703f5594D2573eb71Aaf55BC0CB548492df4'],
  symbol: 'veMULTI',
}

export const getContracts = async () => {
  return {
    contracts: { locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    locker: (...args) => getNFTLockerBalances(...args, MULTI, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1665273600,
                  }
                  
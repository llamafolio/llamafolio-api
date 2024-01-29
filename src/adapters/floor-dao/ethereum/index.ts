import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFormattedStakeBalances, getStakeBalances } from './stake'
import { getVesterBalances } from './vester'

const FLOOR: Contract = {
  name: 'Floor',
  chain: 'ethereum',
  address: '0xf59257E961883636290411c11ec5Ae622d19455e',
  decimals: 9,
  symbol: 'FLOOR ',
}

const sFLOOR: Contract = {
  name: 'staked FLOOR',
  chain: 'ethereum',
  address: '0x164afe96912099543bc2c48bb9358a095db8e784',
  decimals: 18,
  symbol: 'sFLOOR',
  underlyings: [FLOOR],
}

const gFLOOR: Contract = {
  name: 'Governance FLOOR',
  chain: 'ethereum',
  address: '0xb1cc59fc717b8d4783d41f952725177298b5619d',
  decimals: 18,
  symbol: 'gFLOOR',
  underlyings: [FLOOR],
}

const vester: Contract = {
  chain: 'ethereum',
  address: '0xe1d71b60642d597e6e3dbf6d0cd106ac3cfa65fa',
  underlyings: [gFLOOR],
}

export const getContracts = () => {
  return {
    contracts: { sFLOOR, gFLOOR, vester },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sFLOOR: getStakeBalances,
    gFLOOR: getFormattedStakeBalances,
    vester: getVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1646352000,
                  }
                  
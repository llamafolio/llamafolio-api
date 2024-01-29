import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from './stake'
import { getVestBalances } from './vest'

const SPA: Contract = {
  name: 'Spartacus ',
  displayName: 'Spartacus ',
  chain: 'fantom',
  address: '0x5602df4A94eB6C680190ACCFA2A475621E0ddBdc',
  decimals: 9,
  symbol: 'SPA',
}

const sSPA: Contract = {
  name: 'Staked Spartacus',
  displayName: 'Staked Spartacus',
  chain: 'fantom',
  address: '0x8e2549225E21B1Da105563D419d5689b80343E01',
  decimals: 9,
  symbol: 'sSPA',
  underlyings: [SPA],
}

const DaiBond: Contract = {
  name: 'Spartacus Bond Depository',
  chain: 'fantom',
  address: '0x5D449738986ab34280373502031D1513581Cb649',
  symbol: 'DAI BOND',
  underlyings: [SPA],
  rewards: [SPA],
}

const SpaDaiLpBond: Contract = {
  name: 'Spartacus Bond Depository',
  chain: 'fantom',
  address: '0x8927a01AcBb4820f848711e2B7353d62172053b9',
  symbol: 'SPA-DAI LP BOND',
  underlyings: [SPA],
  rewards: [SPA],
}

export const getContracts = () => {
  const bonds: Contract[] = [DaiBond, SpaDaiLpBond]

  return {
    contracts: { sSPA, bonds },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sSPA: getStakeBalances,
    bonds: getVestBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1635897600,
                  }
                  
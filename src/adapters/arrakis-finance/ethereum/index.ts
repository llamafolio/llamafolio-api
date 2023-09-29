import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getArrakisV1FarmBalances, getArrakisV2FarmBalances, getLpBalances } from '../common/balances'
import { getFarmersContracts, getVaults } from '../common/contracts'

const farmers_v1: `0x${string}`[] = [
  '0x52c0faaf48bc8de603d7ef50d4e2e48e8bf59311',
  '0xc78f036f557925270e3506e140cfe5f2a188c3a3',
  '0x4ace4b3eb96bd7b3136ab7e14f070717a8137be8',
  '0x83c1aef2d4ce3b7c09930ad1cdda626839f93608',
  '0x5c00be319ecf60ec35d00094d192e97becb4d06c',
  '0x4974a491f43de6ebcd1b3528aa52383b7692824f',
]

const farmers_v2: `0x${string}`[] = [
  '0xb378c842521698720b45239d3f7317a46191a2f1',
  '0xc2b92cd8ba2871259083fe7171b3c514899a7174',
]

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'ethereum',
  address: '0xEA1aFf9dbFfD1580F6b81A3ad3589E66652dB7D9',
}

const helper: Contract = {
  chain: 'ethereum',
  address: '0x89E4bE1F999E3a58D16096FBe405Fc2a1d7F07D6',
}

export const getContracts = async (ctx: BaseContext) => {
  const [vaults, pools_v1, pool_v2] = await Promise.all([
    getVaults(ctx, factoryArrakis),
    getFarmersContracts(ctx, farmers_v1),
    getFarmersContracts(ctx, farmers_v2),
  ])

  return {
    contracts: { vaults, pools_v1, pool_v2 },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getLpBalances,
    pools_v1: getArrakisV1FarmBalances,
    pool_v2: (...args) => getArrakisV2FarmBalances(...args, helper),
  })

  return {
    groups: [{ balances }],
  }
}

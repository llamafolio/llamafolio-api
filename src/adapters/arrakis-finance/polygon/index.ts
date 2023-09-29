import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getArrakisV1FarmBalances, getLpBalances } from '../common/balances'
import { getFarmersContracts, getVaults } from '../common/contracts'

const farmers_v1: `0x${string}`[] = [
  '0xfb5b8515b011b073defb5fa63b05a7190a5207b3',
  '0x33d1ad9cd88a509397cd924c2d7613c285602c20',
  '0x56c5b00bdeb3cb8adf745650599f9adef3c40275',
  '0x9941c03d31bc8b3aa26e363f7dd908725e1a21bb',
  '0xedf8c3ad1186d6ecb8b8cd08230b9434768252a5',
  '0xdb01724cd5885d76438d2b54097c9dd8dbf443a1',
  '0x5e65a272fb0d594c7447f05928011c4f7f53c808',
  '0x50be234a8405c32c15712850377deec768628bc9',
  '0x0fca3755b1de447d15f8414f83fa650da255020f',
  '0x15bde1a8d16d4072d949591afd4fa7ad9d127d05',
  '0x5aabe80f1d80842408da860384a05a85e9a64e98',
  '0x67092ab1c3dac772ff15f823eb48cb63f087b691',
  '0xb76359a71843bcef4cc749f0f0cf1a2672f604ba',
]

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'polygon',
  address: '0x37265A834e95D11c36527451c7844eF346dC342a',
}

export const getContracts = async (ctx: BaseContext) => {
  const [vaults, pools_v1] = await Promise.all([getVaults(ctx, factoryArrakis), getFarmersContracts(ctx, farmers_v1)])

  return {
    contracts: { vaults, pools_v1 },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getLpBalances,
    pools_v1: getArrakisV1FarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

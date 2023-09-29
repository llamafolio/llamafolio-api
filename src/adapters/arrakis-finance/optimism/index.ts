import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getArrakisV1FarmBalances, getArrakisV2FarmBalances, getLpBalances } from '../common/balances'
import { getFarmersContracts, getVaults } from '../common/contracts'

const farmers_v1: `0x${string}`[] = [
  '0x8b24d44772a27030353bee0f252844602abbb0f1',
  '0x87c7c885365700d157cd0f39a7803320fe86f0f5',
  '0x8d1c480bca1439ae5d5a81a75d53f9bf6ec513f1',
  '0x7f3013aa21c784793ae6420140d0703aac1b76be',
  '0xe49d19c155a8658f5744ed336f18b7c086979c34',
  '0x310b18daa9d351062c6d2ec0f0411d327206b4c3',
  '0x1b6a53991f257ac9dd1d0c061c37e1be36e0a8e6',
  '0x43667563725040febe9bf5164a38b7258105a210',
  '0xb8888ea29e2f70ad62a3b69b1a1342720612a00d',
  '0xff949c5dcc4f48130b3459dad15a793ab78b698a',
  '0x68f51d2aeb485ca3a65a7ff54e9266dd5ea4c58b',
  '0xd3a3fbae792c4ed0aa909ec032d3f14c999b2402',
  '0xdedd02e7da507fe2ac09c509da10b94483e80aa5',
  '0x7e232aeed14446d427579b4f77251552b065df00',
  '0xdf50c6111f45132a1db5ec48bdcd1e8e6c7ce65d',
  '0x212f71bff67e5b7795952a916598c4b64ba48741',
  '0x499b7cbd0f84318fee1edded7b5458f6f4500ab3',
  '0x1535ec8c7477d38066326189f5b1c695c2846479',
  '0x62bdb9544a14dcd8804f7f2cc1479c82fb36c2a6',
  '0x57a2b0b2bb1e21fcb2df358fc832ae3f9f535b48',
  '0x367f2dea1632ea767a5e968fefa4c0dd78dea853',
  '0xe140e5def72fde807890d89ee4f987d316c25196',
  '0xc36681303c7a41b045636af915486b22214b6292',
  '0xbee2b73493f342b1abee4c747be6ad53e02c071e',
]

const farmers_v2: `0x${string}`[] = ['0xd9723fffda369d119fbd66a15113144bf76e281c']

const factoryArrakis: Contract = {
  name: 'factory',
  displayName: 'Arrakis Factory',
  chain: 'optimism',
  address: '0x2845c6929d621e32B7596520C8a1E5a37e616F09',
}

const helper: Contract = {
  chain: 'optimism',
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

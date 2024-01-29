import type { AdapterConfig } from "@lib/adapter";import { getjGLPYieldBalances, getjUSDCYieldBalance } from '@adapters/jones-dao/arbitrum/balances'
import { getJPools, getJPoolsBalances } from '@adapters/jones-dao/arbitrum/jpool'
import {
  getJonesJonesMasterChefPendingRewards,
  getJonesMasterChefPoolInfos,
} from '@adapters/jones-dao/arbitrum/masterChef'
import { getJonesPendingRewards, getJonesPoolInfos } from '@adapters/jones-dao/arbitrum/miniChef'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getVaultTokens } from '@lib/gmx/vault'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

const ARB: Contract = {
  chain: 'arbitrum',
  address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  decimals: 18,
  symbol: 'ARB',
}

const JONES: Contract = {
  chain: 'arbitrum',
  address: '0x10393c20975cF177a3513071bC110f7962CD67da',
  decimals: 18,
  symbol: 'JONES',
}

const jUSDC: Contract = {
  chain: 'arbitrum',
  address: '0xe66998533a1992ece9ea99cdf47686f4fc8458e0',
  underlyings: ['0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'],
}

const rawJGLP: Contract = {
  chain: 'arbitrum',
  address: '0x7241bc8035b65865156ddb5edef3eb32874a3af6',
  token: '0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf',
}

const miniChef: Contract = {
  chain: 'arbitrum',
  address: '0x0aefad19aa454bcc1b1dd86e18a7d58d0a6fac38',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0xb94d1959084081c5a11c460012ab522f5a0fd756',
}

const jPoolsAddresses: `0x${string}`[] = [
  '0xeb23c7e19db72f9a728fd64e1caa459e457cfaca',
  '0x13c6bed5aa16823aba5bba691caec63788b19d9d',
]

const vault: Contract = {
  chain: 'arbitrum',
  address: '0x489ee077994b6658eafa855c308275ead8097c4a',
}

export const getContracts = async (ctx: BaseContext) => {
  const [miniPools, masterChefPools, jGLP, jPools] = await Promise.all([
    getMasterChefPoolsContracts(ctx, { masterChefAddress: miniChef.address, getPoolInfos: getJonesPoolInfos }),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: masterChef.address,
      getPoolInfos: getJonesMasterChefPoolInfos,
    }),
    { ...rawJGLP, underlyings: await getVaultTokens(ctx, vault) },
    getJPools(ctx, jPoolsAddresses),
  ])

  return {
    contracts: { jUSDC, jGLP, jPools, miniPools, masterChefPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    jUSDC: getjUSDCYieldBalance,
    jGLP: (...args) => getjGLPYieldBalances(...args, vault),
    jPools: getJPoolsBalances,
    miniPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: miniChef.address,
        rewardToken: ARB,
        getUserPendingRewards: getJonesPendingRewards,
      }),
    masterChefPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: masterChef.address,
        rewardToken: JONES,
        getUserPendingRewards: getJonesJonesMasterChefPendingRewards,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1645228800,
                  }
                  
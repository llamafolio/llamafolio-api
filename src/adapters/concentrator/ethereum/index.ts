import {
  getConcentratorOldPoolInfos,
  getConcentratorPoolInfos,
  getConcentratorUnderlyings,
  getUserPendingaCRV,
  getUserPendingaFXS,
} from '@adapters/concentrator/ethereum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts } from '@lib/masterchef/masterChefContract'

import { getOldStakeBalances, getStakeBalances, getStakeInPools } from './staker'

const CTR: Contract = {
  chain: 'ethereum',
  address: '0xb3ad645db386d7f6d753b2b9c3f4b853da6890b8',
  decimals: 18,
  symbol: 'CTR',
}

const CRV: Contract = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const cvxCRV: Contract = {
  chain: 'ethereum',
  address: '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7',
  decimals: 18,
  symbol: 'cvxCRV',
}

const cvxFXS: Contract = {
  chain: 'ethereum',
  address: '0xf3a43307dcafa93275993862aae628fcb50dc768',
  decimals: 18,
  symbol: 'cvxFXSFXS-f',
}

const frxETHCRV: Contract = {
  chain: 'ethereum',
  address: '0xf43211935c781d5ca1a41d2041f397b8a7366c7a',
  decimals: 18,
  symbol: 'frxETHCRV',
}

const aCRV: Contract = {
  chain: 'ethereum',
  address: '0x2b95A1Dcc3D405535f9ed33c219ab38E8d7e0884',
  underlyings: [cvxCRV],
  symbol: 'aCRV',
  decimals: 18,
}

const aFXS: Contract = {
  chain: 'ethereum',
  address: '0xDAF03D70Fe637b91bA6E521A32E1Fb39256d3EC9',
  underlyings: [cvxFXS],
}

const afrxETH: Contract = {
  chain: 'ethereum',
  address: '0xb15Ad6113264094Fd9BF2238729410A07EBE5ABa',
  token: '0xf43211935c781d5ca1a41d2041f397b8a7366c7a',
  underlyings: [frxETHCRV],
}

const abcCVX: Contract = {
  chain: 'ethereum',
  address: '0xdec800c2b17c9673570fdf54450dc1bd79c8e359',
  token: '0xf9078fb962a7d13f55d40d49c8aa6472abd1a5a6',
}

const sdCRV: Contract = {
  chain: 'ethereum',
  address: '0x43e54c2e7b3e294de3a155785f52ab49d87b9922',
  underlyings: [CRV],
}

const aCVX: Contract = {
  chain: 'ethereum',
  address: '0xb0903ab70a7467ee5756074b31ac88aebb8fb777',
  underlyings: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b'],
}

const veCTR: Contract = {
  name: 'Vote Escrowed CTR',
  chain: 'ethereum',
  address: '0xe4C09928d834cd58D233CD77B5af3545484B4968',
  decimals: 18,
  symbol: 'veCTR',
  underlyings: ['0xb3ad645db386d7f6d753b2b9c3f4b853da6890b8'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [
    concentratorIFOVaultPools,
    aladdinConvexPools,
    aladdinFXSConvexPools,
    concentratorAladdinETHPools,
    ConcentratorAsdCRVPools,
  ] = await Promise.all([
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: '0x3cf54f3a1969be9916dad548f3c084331c4450b5',
      getPoolInfos: getConcentratorPoolInfos,
      getLpToken: ({ lpToken }) => lpToken[4],
    }),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: '0xc8fF37F7d057dF1BB9Ad681b53Fa4726f268E0e8',
      getPoolInfos: getConcentratorPoolInfos,
      getLpToken: ({ lpToken }) => lpToken[4],
    }),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: '0xD6E3BB7b1D6Fa75A71d48CFB10096d59ABbf99E1',
      getPoolInfos: getConcentratorPoolInfos,
      getLpToken: ({ lpToken }) => lpToken[4],
    }),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: '0x50B47c4A642231dbe0B411a0B2FBC1EBD129346D',
      getPoolInfos: getConcentratorOldPoolInfos,
      getLpToken: ({ lpToken }) => lpToken[1].token,
    }),
    getMasterChefPoolsContracts(ctx, {
      masterChefAddress: '0x59866EC5650e9BA00c51f6D681762b48b0AdA3de',
      getPoolInfos: getConcentratorOldPoolInfos,
      getLpToken: ({ lpToken }) => lpToken[1].token,
    }),
  ])

  return {
    contracts: {
      veCTR,
      aCRV,
      sdCRV,
      aCVX,
      abcCVX,
      stakers: [aFXS, afrxETH],
      concentratorIFOVaultPools,
      aladdinConvexPools,
      aladdinFXSConvexPools,
      concentratorAladdinETHPools,
      ConcentratorAsdCRVPools,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veCTR: (...args) => getSingleLockerBalance(...args, CTR, 'locked'),
    aCRV: getStakeBalances,
    sdCRV: getStakeBalances,
    aCVX: getStakeBalances,
    abcCVX: getOldStakeBalances,
    stakers: getStakeInPools,
    concentratorIFOVaultPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0x3cf54f3a1969be9916dad548f3c084331c4450b5',
        rewardToken: aCRV,
        getResolvedUnderlyings: getConcentratorUnderlyings,
        getUserPendingRewards: getUserPendingaCRV,
      }),
    aladdinConvexPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0xc8fF37F7d057dF1BB9Ad681b53Fa4726f268E0e8',
        rewardToken: aCRV,
        getResolvedUnderlyings: getConcentratorUnderlyings,
        getUserPendingRewards: getUserPendingaCRV,
      }),
    aladdinFXSConvexPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0xD6E3BB7b1D6Fa75A71d48CFB10096d59ABbf99E1',
        rewardToken: aFXS,
        getResolvedUnderlyings: getConcentratorUnderlyings,
        getUserPendingRewards: getUserPendingaFXS,
      }),
    concentratorAladdinETHPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0x50B47c4A642231dbe0B411a0B2FBC1EBD129346D',
        rewardToken: afrxETH,
        getResolvedUnderlyings: getConcentratorUnderlyings,
        getUserPendingRewards: getUserPendingaFXS,
      }),
    ConcentratorAsdCRVPools: (...args) =>
      getMasterChefPoolsBalances(...args, {
        masterChefAddress: '0x59866EC5650e9BA00c51f6D681762b48b0AdA3de',
        rewardToken: sdCRV,
        getResolvedUnderlyings: getConcentratorUnderlyings,
        getUserPendingRewards: getUserPendingaFXS,
      }),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1647216000,
}

import type { AdapterConfig } from "@lib/adapter";import { getParallelBPT_v2FarmBalances } from '@adapters/parallel-protocol/common/bptFarm'
import { getParallelLendBalances } from '@adapters/parallel-protocol/common/lend'
import { getParallelLpFarmBalances } from '@adapters/parallel-protocol/common/lpFarm'
import { getParallelMimoRewardsBalances, getParallelParStakeBalance } from '@adapters/parallel-protocol/common/stake'
import { getVaultWithAssets } from '@adapters/parallel-protocol/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

const assets: `0x${string}`[] = [
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
  '0x172370d5cd63279efa6d502dab29171933a610af', // CRV
  '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3', // BAL
  '0xd6df932a45c0f255f85145f286ea0b292b21c90b', // AAVE
  '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39', // LINK
  '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a', // SUSHI
  '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4', // stMATIC
  '0xfa68fb4628dff1028cfec22b4162fccd0d45efb6', // MATICX
  '0x03b54a6e9a984069379fae1a4fc4dbae93b3bccd', // wstETH
]

const PAR: Token = {
  chain: 'polygon',
  address: '0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128',
  decimals: 18,
  symbol: 'PAR',
}

const MIMO: Contract = {
  chain: 'polygon',
  address: '0xADAC33f543267c4D59a8c299cF804c303BC3e4aC',
  decimals: 18,
  symbol: 'MIMO',
  rewarder: [
    '0x0f307e021a7e7d03b6d753b972d349f48d0b7e2b',
    '0xeac544c12e8ede461190bb573e5d56f9198811ac',
    '0xdccd52eb99a7395398e4603d21f4932782f5d9ea',
    '0x8b264d48c0887bc2946ea8995c3afcdbb576f799',
  ],
}

// Lp Contracts
const USDC_PAR_LP: Contract = {
  chain: 'polygon',
  address: '0x528330ff7c358fe1bae348d23849cced8eda5917',
  token: '0xc1df4e2fd282e39346422e40c403139cd633aacd',
  underlyings: ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174', '0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128'],
  rewards: ['0xADAC33f543267c4D59a8c299cF804c303BC3e4aC'],
}

// BPT_v2 Contracts
const USDC_PAR_BPT_2: Contract = {
  chain: 'polygon',
  address: '0xdbe0ec403e2f206fe3e45408657449082369c6fe',
  token: '0xb2634e2bfab9664f603626afc3d270be63c09ade',
  underlyings: ['0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', '0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128'],
  poolId: '0xb2634e2bfab9664f603626afc3d270be63c09ade000200000000000000000021',
  rewards: ['0xADAC33f543267c4D59a8c299cF804c303BC3e4aC'],
}

const PAR_MIMO_2_BPT_2: Contract = {
  chain: 'polygon',
  address: '0xbb7102bed9b6593956ee685a5e3d7dc36f60d330',
  token: '0x77952e11e1ba727ffcea95a0f38ed7da586eebc7',
  underlyings: ['0xADAC33f543267c4D59a8c299cF804c303BC3e4aC', '0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128'],
  poolId: '0x77952e11e1ba727ffcea95a0f38ed7da586eebc7000200000000000000000072',
  rewards: ['0xADAC33f543267c4D59a8c299cF804c303BC3e4aC'],
}

const vault: Contract = {
  chain: 'polygon',
  address: '0xde1996189ee1857d79f1f2bebe2a4a2b200bcb44',
}

const config: Contract = {
  chain: 'polygon',
  address: '0xcae2cae9a4384b196c0f1bae59724e0eb9a347e0',
}

const locker: Contract = {
  chain: 'polygon',
  address: '0x6df4822a7e71ef497bd09845d6b865f2b015da0b',
}

const staker_PAR: Contract = {
  chain: 'polygon',
  address: '0xf6298bf14a1feeddefeb756799e89b5291bc0cdd',
  token: '0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128',
  rewards: ['0xe2aa7db6da1dae97c5f5c6914d285fbfcc32a128', '0xADAC33f543267c4D59a8c299cF804c303BC3e4aC'],
}

export const getContracts = async (ctx: BaseContext) => {
  const vaultWithAssets = await getVaultWithAssets(ctx, PAR, vault, assets)

  return {
    contracts: {
      vaultWithAssets,
      locker,
      lpFarmers: [USDC_PAR_LP],
      bptFarmersv2: [USDC_PAR_BPT_2, PAR_MIMO_2_BPT_2],
      staker_PAR,
      MIMO,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getParallelLendBalances(ctx, contracts.vaultWithAssets!, config),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      locker: (...args) => getSingleLockerBalance(...args, MIMO, 'locked'),
      lpFarmers: getParallelLpFarmBalances,
      bptFarmersv2: getParallelBPT_v2FarmBalances,
      staker_PAR: getParallelParStakeBalance,
      MIMO: getParallelMimoRewardsBalances,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1643414400,
                  }
                  
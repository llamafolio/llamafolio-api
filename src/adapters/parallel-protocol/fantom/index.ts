import type { AdapterConfig } from "@lib/adapter";import { getParallelLendBalances } from '@adapters/parallel-protocol/common/lend'
import { getParallelMimoRewardsBalances, getParallelParStakeBalance } from '@adapters/parallel-protocol/common/stake'
import { getVaultWithAssets } from '@adapters/parallel-protocol/common/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'
import type { Token } from '@lib/token'

const assets: `0x${string}`[] = [
  '0x04068da6c83afcfa0e13ba15a6696662335d5b75', // USDC
  '0x74b23882a30290451A17c44f4F05243b6b58C76d', // WETH
  '0x321162Cd933E2Be498Cd2267a90534A804051b11', // WBTC
  '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', // WFTM
]

const PAR: Token = {
  chain: 'fantom',
  address: '0x13082681e8ce9bd0af505912d306403592490fc7',
  decimals: 18,
  symbol: 'PAR',
}

const MIMO: Contract = {
  chain: 'fantom',
  address: '0x1D1764F04DE29da6b90ffBef372D1A45596C4855',
  decimals: 18,
  symbol: 'MIMO',
  rewarder: [
    '0x3a851b97b786a601328496c80fd67934065eaad3',
    '0x5f640bcb86d662a817316cb9ab739f9a5a9cc804',
    '0x7d7bb07739bdfc71d2c942677a95406301a99c05',
    '0xfe5972b8a965415bce47074da51d8bb487d50317',
  ],
}

const vault: Contract = {
  chain: 'fantom',
  address: '0x4f9e850b5179ab8bbaa23de10c54ea4a2c31f4b5',
}

const config: Contract = {
  chain: 'fantom',
  address: '0x6283bec3cd438fffeec7a13e741ce201ed4ed053',
}

const locker: Contract = {
  chain: 'fantom',
  address: '0xce6b5fedd4fd9421aad6c8fbd5d5808d0f5db9c5',
}

const staker_PAR: Contract = {
  chain: 'fantom',
  address: '0xe96c9af9c406c914bf828e4069922fcdd629e111',
  token: '0x13082681e8ce9bd0af505912d306403592490fc7',
  rewards: ['0x13082681e8ce9bd0af505912d306403592490fc7', '0x1D1764F04DE29da6b90ffBef372D1A45596C4855'],
}

export const getContracts = async (ctx: BaseContext) => {
  const vaultWithAssets = await getVaultWithAssets(ctx, PAR, vault, assets)

  return {
    contracts: {
      vaultWithAssets,
      locker,
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
                  
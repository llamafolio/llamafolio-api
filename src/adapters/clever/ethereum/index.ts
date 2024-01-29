import type { AdapterConfig } from "@lib/adapter";import { getCleCVXLendBalances, getCleLendBalances } from '@adapters/clever/ethereum/balance'
import { getCleFarmContracts, getCleLendContracts } from '@adapters/clever/ethereum/contract'
import { getCleFarmBalances } from '@adapters/clever/ethereum/farm'
import { getCleStakeBalance } from '@adapters/clever/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const CLEV: Contract = {
  chain: 'ethereum',
  address: '0x72953a5C32413614d24C29c84a66AE4B59581Bbf',
  decimals: 18,
  symbol: 'CLEV',
}

const cleCVXLending: Contract = {
  chain: 'ethereum',
  address: '0x96c68d861ada016ed98c30c810879f9df7c64154',
  underlyings: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b', '0xf05e58fcea29ab4da01a495140b349f8410ba904'],
}

const cleLendAddresses: `0x${string}`[] = [
  '0x2c37f1dced208530a05b061a183d8937f686157e',
  '0xad4cac207a0bfed10df8a4fc6a28d377cac730e0',
  '0xeb0ea9d24235ab37196111eedd656d56ce4f53b1',
  '0xb2fcee71b25b62bafe442c58af58c42143673cc1',
]

const cleStaking: Contract = {
  chain: 'ethereum',
  address: '0xce4dcc5028588377e279255c0335effe2d7ab72a',
  token: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x94be07d45d57c7973a535c1c517bd79e602e051e',
}

const farmersAddresses: `0x${string}`[] = [
  '0xc5022291ca8281745d173bb855dcd34dda67f2f0',
  '0x86e917ad6cb44f9e6c8d9fa012acf0d0cfcf114f',
  '0xf758be28e93672d1a8482be15eaf21aa5450f979',
  '0x9b02548de409d7aaee228bfa3ff2bca70e7a2fe8',
]

export const getContracts = async (ctx: BaseContext) => {
  const [lendContracts, farmContracts] = await Promise.all([
    getCleLendContracts(ctx, cleLendAddresses),
    getCleFarmContracts(ctx, farmersAddresses),
  ])

  return {
    contracts: { cleCVXLending, lendContracts, farmContracts, cleStaking, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balanceGroups, balances] = await Promise.all([
    getCleLendBalances(ctx, contracts.lendContracts || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      locker: (...args) => getSingleLockerBalance(...args, CLEV, 'locked'),
      cleCVXLending: getCleCVXLendBalances,
      cleStaking: getCleStakeBalance,
      farmContracts: getCleFarmBalances,
    }),
  ])

  return {
    groups: [...balanceGroups, { balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1651104000,
                  }
                  
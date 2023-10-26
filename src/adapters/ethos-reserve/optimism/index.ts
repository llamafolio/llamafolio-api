import {
  getEthosFarmBalance,
  getEthosLendBalances,
  getEthosStakeBalance,
} from '@adapters/ethos-reserve/optimism/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'optimism',
  address: '0x9425b96462b1940e7563cd765464300f6a774805',
  token: '0xd20f6f1d8a675cdca155cb07b5dc9042c467153f',
  underlyings: ['0x39FdE572a18448F8139b7788099F0a0740f51205', '0x4200000000000000000000000000000000000006'],
  poolId: '0xd20f6f1d8a675cdca155cb07b5dc9042c467153f0002000000000000000000bc',
  vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const stabilityPool: Contract = {
  chain: 'optimism',
  address: '0x8b147a2d4fc3598079c64b8bf9ad2f776786cfed',
}

const troveManager: Contract = {
  displayName: 'Trove Manager',
  chain: 'optimism',
  address: '0xd584a5e956106db2fe74d56a0b14a9d64be8dc93',
}

const borrowerOperations: Contract = {
  name: 'Borrower Operations',
  chain: 'optimism',
  address: '0x0a4582d3d9ecbab80a66dad8a881be3b771d3e5b',
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { staker, stabilityPool, borrowerOperations },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getEthosStakeBalance,
    borrowerOperations: (...args) => getEthosLendBalances(...args, troveManager),
    stabilityPool: getEthosFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}

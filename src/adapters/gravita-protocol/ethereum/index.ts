import { getGravitaLendBalances } from '@adapters/gravita-protocol/ethereum/lend'
import { getGravitaStakeBalance } from '@adapters/gravita-protocol/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const StabilityPool: Contract = {
  chain: 'ethereum',
  address: '0x4f39f12064d83f6dd7a2bdb0d53af8be560356a6',
  token: '0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4',
  rewards: ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', '0xae78736Cd615f374D3085123A210448E74Fc6393'],
}

const borrowerOperations: Contract = {
  name: 'Borrower Operations',
  chain: 'ethereum',
  address: '0x2bca0300c2aa65de6f19c2d241b54a445c9990e2',
}

const vessel: Contract = {
  chain: 'ethereum',
  address: '0xdB5DAcB1DFbe16326C3656a88017f0cB4ece0977',
  underlyings: [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '0xae78736Cd615f374D3085123A210448E74Fc6393',
    '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    '0xB9D7DdDca9a4AC480991865EfEf82E01273F79C3',
  ],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { StabilityPool, borrowerOperations },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    StabilityPool: getGravitaStakeBalance,
    borrowerOperations: (...args) => getGravitaLendBalances(...args, vessel),
  })

  return {
    groups: [{ balances }],
  }
}

import { getMoverBalance } from '@adapters/mover/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const MOBO: Contract = {
  chain: 'ethereum',
  address: '0x94f748bfd1483750a7df01acd993213ab64c960f',
  underlyings: ['0x3fa729b4548becbad4eab6ef18413470e6d5324c', '0x87b918e76c92818db0c76a4e174447aee6e6d23f'],
  rewards: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
}

export const getContracts = () => {
  return {
    contracts: { MOBO },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    MOBO: getMoverBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1642550400,
}

import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getLockedBalances, getStakeBalances } from './balances'

const TEMPLE: Contract = {
  name: 'Temple',
  displayName: 'Temple Token',
  chain: 'ethereum',
  address: '0x470ebf5f030ed85fc1ed4c2d36b9dd02e77cf1b7',
  decimals: 18,
  symbol: 'TEMPLE ',
}

const OG_TEMPLE: Contract = {
  name: 'OGTemple',
  chain: 'ethereum',
  address: '0x654590f810f01b51dc7b86915d4632977e49ea33',
  decimals: 18,
  symbol: 'OG_TEMPLE',
  underlyings: [TEMPLE],
}

const Vault_A: Contract = {
  name: '1m-core-a',
  chain: 'ethereum',
  address: '0x402832ec42305cf7123bc9903f693e944484b9c1',
  decimals: 18,
  symbol: '1m-core-a',
  underlyings: [TEMPLE],
}

const Vault_B: Contract = {
  name: '1m-core-b',
  chain: 'ethereum',
  address: '0xa99980c64fc6c302377c39f21431217fcbaf39af',
  decimals: 18,
  symbol: '1m-core-b',
  underlyings: [TEMPLE],
}

const Vault_C: Contract = {
  name: '1m-core-c',
  chain: 'ethereum',
  address: '0xb6226ad4fef850dc8b85a83bdc0d4aff9c61cd39',
  decimals: 18,
  symbol: '1m-core-c',
  underlyings: [TEMPLE],
}

const Vault_D: Contract = {
  name: '1m-core-d',
  chain: 'ethereum',
  address: '0xd43cc1814bd87b67b318e4807cde50c090d01c1a',
  decimals: 18,
  symbol: '1m-core-d',
  underlyings: [TEMPLE],
}

const getContracts = () => {
  const vaults: Contract[] = [Vault_A, Vault_B, Vault_C, Vault_D]

  return {
    contracts: { OG_TEMPLE, vaults },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { OG_TEMPLE, vaults }) => {
  const [stakeBalances, lockedBalances] = await Promise.all([
    getStakeBalances(ctx, 'ethereum', OG_TEMPLE),
    getLockedBalances(ctx, 'ethereum', vaults || []),
  ])

  const balances = [...stakeBalances, ...lockedBalances]

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'templedao',
  getContracts,
  getBalances,
}

export default adapter

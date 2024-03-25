import { getBinaryxBalances } from '@adapters/binaryx-platform/polygon/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const bBaliAddresses: `0x${string}`[] = [
  '0x27ceb34ac7545f78a97c0500465ace9fa10570af',
  '0x2d02e704174635f5e88e17995c3a5e29f283c033',
  '0xb1b987ff1f317a47876185de4de9c430823ad8c5',
  '0xa07db641fc95067a2fe68b6224a9dd39564bfd57',
]

export const getContracts = () => {
  const pools: Contract[] = bBaliAddresses.map((address) => ({
    chain: 'polygon',
    address,
    token: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  }))

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBinaryxBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706745600,
}

import { getPOOFBalances } from '@adapters/houdini-swap/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x488b813ed84ab52857ca90ade050f8ca126beda6',
    token: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  },
  {
    chain: 'ethereum',
    address: '0xf9fa02cc165dbd70ff34d27b5ac9e0ae6d74d756',
    token: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  },
  {
    chain: 'ethereum',
    address: '0x979a7307dd7ba386b52f08a9a35a26807affbcc9',
    token: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  },
  {
    chain: 'ethereum',
    address: '0xe42adcb4b9f2e3e6acb70399c420cb6d6795b09d',
    token: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  },
  {
    chain: 'ethereum',
    address: '0xe3507b38342ccb9aa03e5af2dea6c1f54351f553',
    token: '0x888cea2bbdd5d47a4032cf63668d7525c74af57a',
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getPOOFBalances,
  })

  return {
    groups: [{ balances }],
  }
}

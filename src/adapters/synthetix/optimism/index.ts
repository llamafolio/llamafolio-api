import { getSNXBalances } from '@adapters/synthetix/common/balance'
import { getSNXFarmBalances } from '@adapters/synthetix/common/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const SNX: Contract = {
  chain: 'optimism',
  address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4',
  token: '0xff5c26abd36078c768c40847672202ec343ac5ad',
  underlyings: ['0xDfA2d3a0d32F870D87f8A0d7AA6b9CdEB7bc5AdB'],
  rewarder: '0xf9FE3607e6d19D8dC690DD976061a91D4A0db30B',
}

const farmers: Contract[] = [
  {
    chain: 'optimism',
    address: '0xfd49c7ee330fe060ca66fee33d49206eb96f146d',
    token: '0x83beefb4ca39af649d03969b442c0e9f4e1732d8',
    underlyings: ['0x4200000000000000000000000000000000000006', '0x8700daec35af8ff88c16bdf0418774cb3d7599b4'],
    provider: 'arrakis',
  },
]

export const getContracts = async () => {
  return {
    contracts: { SNX, farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    SNX: getSNXBalances,
    farmers: getSNXFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

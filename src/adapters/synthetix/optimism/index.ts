import { getSNXBalances } from '@adapters/synthetix/common/balance'
import { getSNXFarmBalances } from '@adapters/synthetix/common/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const sUSD: Token = {
  chain: 'optimism',
  address: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9',
  decimals: 18,
  symbol: 'sUSD',
}

const SNX: Contract = {
  chain: 'optimism',
  address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4',
  asset: sUSD,
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
  const [lendBalances, balances] = await Promise.all([
    getSNXBalances(ctx, contracts.SNX || undefined),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      farmers: getSNXFarmBalances,
    }),
  ])

  const groups = lendBalances ? [{ ...lendBalances }, { balances }] : [{ balances }]

  return { groups }
}

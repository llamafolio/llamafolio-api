import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const pools: Contract[] = [
  { chain: 'bsc', address: '0x14732123c443f8e815d5c64f3c7ecb63bceeab74' },
  { chain: 'bsc', address: '0xf51709f61447e2647528ccc9030d6fe492c30d63' },
  { chain: 'bsc', address: '0x9faf5eafc5e54094aa1474fb435b92f0ec2c8b35' },
]

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsDetails(ctx, pools)

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

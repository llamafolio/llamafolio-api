import { getGivethFarmBalances, getGivethStakeBalance } from '@adapters/giveth/gnosis/balance'
import { getGivethPools } from '@adapters/giveth/gnosis/pool'
import { getGivethAirdrops } from '@adapters/giveth/gnosis/reward'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const rewarders: Contract[] = [
  {
    chain: 'gnosis',
    address: '0xc0dbdca66a0636236fabe1b3c16b1bd4c84bb1e1',
    token: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
  },
  {
    chain: 'gnosis',
    address: '0xa9a37a14e562d0e1d335b4714e3455483ede7a9a',
    token: '0x21a42669643f45bc0e086b8fc2ed70c23d67509d',
  },
]

const poolAddresses: `0x${string}`[] = [
  '0x9a333ad00868472c0314f76db8da305b83890129',
  '0xfb429010c1e9d08b7347f968a7d88f0207807ef0',
  '0x502ec7a040f486ee6cb7d634d94764874b29de68',
  '0x4b9efae862a1755f7cecb021856d467e86976755',
  '0x24a6067fed46dc8663794c4d39ec91b074cf85d4',
]

const staker: Contract = {
  chain: 'gnosis',
  address: '0xd93d3bdba18ebcb3317a57119ea44ed2cf41c2f2',
  token: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getGivethPools(ctx, poolAddresses)

  return {
    contracts: { staker, pools, rewarders },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getGivethStakeBalance,
    pools: getGivethFarmBalances,
    rewarders: getGivethAirdrops,
  })

  return {
    groups: [{ balances }],
  }
}

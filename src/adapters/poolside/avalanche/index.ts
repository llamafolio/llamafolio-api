import { getPoolSideBalances } from '@adapters/poolside/common/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts, getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const vault: Contract = {
  chain: 'avalanche',
  address: '0x6bEa94c2651B1cCDa2c15A12ca6E7e9e8512F9FC',
  token: '0x04A150a5002CcD347d322ce11b136e64f6e28e69',
  rewards: ['0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5'],
}

const controller: Contract = {
  chain: 'avalanche',
  address: '0x93627AFf8Ea5098a7761280d1adA79Cffa08CDC4',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const [[pool], { pairs, allPairsLength }] = await Promise.all([
    getPairsDetails(ctx, [vault], { getAddress: (contract) => contract.token! }),
    getPairsContracts({
      ctx,
      factoryAddress: '0x19470c5e0199b7157822ca627860b08750ece375',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pairs,
      pool,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pool: (...args) => getPoolSideBalances(...args, controller),
  })

  return {
    groups: [{ balances }],
  }
}

import { GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

export const getContracts = async () => {
  const pairs = await getPairsContracts({
    chain: 'polygon',
    factoryAddress: '0xcf083be4164828f00cae704ec15a36d711491284',
    length: 100,
  })

  return {
    contracts: { pairs },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'polygon', contracts, { pairs: getPairsBalances })

  return {
    balances,
  }
}

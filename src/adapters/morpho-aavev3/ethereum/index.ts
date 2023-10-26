import { getLendBorrowBalancesAaveV3, getUserHealthFactorV3 } from '@adapters/morpho-aavev3/ethereum/balance'
import { getMarketsContractsMorphoAaveV3 } from '@adapters/morpho-aavev3/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const morphoAave3Proxy: Contract = {
  chain: 'ethereum',
  address: '0x33333aea097c193e66081e930c33020272b33333',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContractsMorphoAaveV3(ctx, morphoAave3Proxy)

  return {
    contracts: { markets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: (...args) => getLendBorrowBalancesAaveV3(...args, morphoAave3Proxy),
    }),
    getUserHealthFactorV3(ctx, morphoAave3Proxy),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}

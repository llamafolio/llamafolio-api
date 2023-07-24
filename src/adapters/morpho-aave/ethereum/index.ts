import { getMarketsContracts, getMarketsContractsMorphoAaveV3 } from '@adapters/morpho-aave/ethereum/contract'
import type { BalancesGroup, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getLendBorrowBalances,
  getLendBorrowBalancesAaveV3,
  getUserHealthFactor,
  getUserHealthFactorV3,
} from './balances'

const lens: Contract = {
  chain: 'ethereum',
  address: '0x507fa343d0a90786d86c7cd885f5c49263a91ff4',
}

const morphoAave3Proxy: Contract = {
  chain: 'ethereum',
  address: '0x33333aea097c193e66081e930c33020272b33333',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, marketsV3] = await Promise.all([
    getMarketsContracts(ctx, lens),
    getMarketsContractsMorphoAaveV3(ctx, morphoAave3Proxy),
  ])

  return {
    contracts: { markets, marketsV3 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [group0Promise, group1Promise] = [
    Promise.all([
      resolveBalances<typeof getContracts>(ctx, contracts, {
        markets: (...args) => getLendBorrowBalances(...args, lens),
      }),
      getUserHealthFactor(ctx, lens),
    ]),
    Promise.all([
      resolveBalances<typeof getContracts>(ctx, contracts, {
        marketsV3: (...args) => getLendBorrowBalancesAaveV3(...args, morphoAave3Proxy),
      }),
      getUserHealthFactorV3(ctx, morphoAave3Proxy),
    ]),
  ]

  const [group0, group1] = await Promise.all([group0Promise, group1Promise])

  const balancesGroups: BalancesGroup[] = [
    { balances: group0[0], healthFactor: group0[1] },
    { balances: group1[0], healthFactor: group1[1] },
  ]

  return {
    groups: balancesGroups,
  }
}

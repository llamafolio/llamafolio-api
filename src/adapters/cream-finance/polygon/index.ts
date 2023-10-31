import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  markets: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'enum ComptrollerV1Storage.Version', name: 'version', type: 'uint8' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const comptroller: Contract = {
  chain: 'polygon',
  address: '0x20ca53e2395fa571798623f1cfbd11fe2c114c24',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
  })

  return {
    contracts: {
      markets,
      comptroller,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

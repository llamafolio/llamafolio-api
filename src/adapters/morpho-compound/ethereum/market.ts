import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  getAllMarkets: {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'address[]', name: 'marketsCreated', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getMarketConfiguration: {
    inputs: [{ internalType: 'address', name: '_poolToken', type: 'address' }],
    name: 'getMarketConfiguration',
    outputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'bool', name: 'isCreated', type: 'bool' },
      { internalType: 'bool', name: 'p2pDisabled', type: 'bool' },
      { internalType: 'bool', name: 'isPaused', type: 'bool' },
      { internalType: 'bool', name: 'isPartiallyPaused', type: 'bool' },
      { internalType: 'uint16', name: 'reserveFactor', type: 'uint16' },
      { internalType: 'uint16', name: 'p2pIndexCursor', type: 'uint16' },
      { internalType: 'uint256', name: 'collateralFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMorphoMarketsContracts(ctx: BaseContext, morphoLens: Contract): Promise<Contract[]> {
  const cTokensAddressesRes = await call({ ctx, target: morphoLens.address, abi: abi.getAllMarkets })

  const marketsDetailsRes = await multicall({
    ctx,
    calls: cTokensAddressesRes.map((cToken) => ({ target: morphoLens.address, params: [cToken] }) as const),
    abi: abi.getMarketConfiguration,
  })

  const [decimalsRes, symbolsRes] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccess(marketsDetailsRes, (market) => {
        const [underlying] = market.output
        return { target: underlying } as const
      }),
      abi: erc20Abi.decimals,
    }),

    multicall({
      ctx,
      calls: mapSuccess(marketsDetailsRes, (market) => {
        const [underlying] = market.output
        return { target: underlying } as const
      }),
      abi: erc20Abi.symbol,
    }),
  ])

  const markets = cTokensAddressesRes
    .map((cToken, idx) => {
      const marketsDetailRes = marketsDetailsRes[idx]
      const decimalRes = decimalsRes[idx]
      const symbolRes = symbolsRes[idx]

      if (!marketsDetailRes.success || !decimalRes.success || !symbolRes.success) {
        return null
      }

      const [
        underlying,
        _isCreated,
        _p2pDisabled,
        _isPaused,
        _isPartiallyPaused,
        _reserveFactor,
        _p2pIndexCursor,
        collateralFactor,
      ] = marketsDetailRes.output

      return {
        chain: ctx.chain,
        address: cToken,
        collateralFactor,
        underlyings: [
          {
            chain: ctx.chain,
            address: underlying,
            decimals: decimalRes.output,
            symbol: symbolRes.output,
          },
        ],
      }
    })
    .filter(isNotNullish)

  return markets
}

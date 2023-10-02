import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getAllMarkets: {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'contract MToken[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  markets: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface GetMarketsContractsProps {
  comptrollerAddress: `0x${string}`
  /**
   * map of underlying tokens by address not defined in Comptroller markets (ex: cETH -> WETH).
   */
  underlyingAddressByMarketAddress?: { [key: string]: `0x${string}` }
}

export async function getMarketsContracts(
  ctx: BaseContext,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
  rewards: Contract[],
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const cTokensAddresses = await call({
    ctx,
    abi: abi.getAllMarkets,
    target: comptrollerAddress,
  })

  const [marketsRes, underlyingTokensAddressesRes] = await Promise.all([
    multicall({
      ctx,
      abi: abi.markets,
      calls: cTokensAddresses.map(
        (cTokenAddress) => ({ target: comptrollerAddress, params: [cTokenAddress] }) as const,
      ),
    }),

    multicall({
      ctx,
      calls: cTokensAddresses.map((address) => ({ target: address })),
      abi: abi.underlying,
    }),
  ])

  for (let i = 0; i < cTokensAddresses.length; i++) {
    const cToken = cTokensAddresses[i]
    const underlying = underlyingAddressByMarketAddress[cToken.toLowerCase()] || underlyingTokensAddressesRes[i].output
    const marketRes = marketsRes[i]

    if (!marketRes.success) {
      continue
    }

    const [_isListed, collateralFactorMantissa] = marketRes.output

    contracts.push({
      chain: ctx.chain,
      address: cToken,
      collateralFactor: collateralFactorMantissa,
      underlyings: [underlying],
      rewards,
    })
  }

  return contracts
}

import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { GetMarketsContractsProps } from '@lib/compound/v2/lending'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  getAlliTokens: {
    inputs: [],
    name: 'getAlliTokens',
    outputs: [{ internalType: 'address[]', name: '_alliTokens', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  markets: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'borrowCapacity', type: 'uint256' },
      { internalType: 'uint256', name: 'supplyCapacity', type: 'uint256' },
      { internalType: 'bool', name: 'mintPaused', type: 'bool' },
      { internalType: 'bool', name: 'redeemPaused', type: 'bool' },
      { internalType: 'bool', name: 'borrowPaused', type: 'bool' },
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

export async function getMarketsContracts(
  ctx: BaseContext,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const cTokensRes = await call({ ctx, target: comptrollerAddress, abi: abi.getAlliTokens })

  const calls: Call<typeof abi.markets>[] = cTokensRes.map((cToken) => ({
    target: comptrollerAddress,
    params: [cToken],
  }))
  const underlyingsCalls: Call<typeof abi.underlying>[] = cTokensRes.map((cToken) => ({ target: cToken }))

  const [marketsRes, underlyingTokensAddressesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.markets }),
    multicall({ ctx, calls: underlyingsCalls, abi: abi.underlying }),
  ])

  for (let i = 0; i < cTokensRes.length; i++) {
    const cToken = cTokensRes[i]
    const underlying = underlyingAddressByMarketAddress[cToken.toLowerCase()] || underlyingTokensAddressesRes[i].output
    const marketRes = marketsRes[i]

    if (!marketRes.success) {
      continue
    }

    const [collateralFactorMantissa] = marketRes.output

    contracts.push({
      chain: ctx.chain,
      address: cToken,
      collateralFactor: collateralFactorMantissa,
      underlyings: [underlying],
    })
  }

  return contracts
}

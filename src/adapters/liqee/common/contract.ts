import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { GetMarketsContractsProps } from '@lib/compound/v2/lending'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export async function getMarketsContracts(
  ctx: BaseContext,
  { comptrollerAddress, underlyingAddressByMarketAddress = {} }: GetMarketsContractsProps,
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const { output: cTokensRes } = await call({ ctx, target: comptrollerAddress, abi: abi.getAlliTokens })

  const calls: Call[] = cTokensRes.map((cToken: string) => ({ target: comptrollerAddress, params: [cToken] }))
  const underlyingsCalls: Call[] = cTokensRes.map((cToken: string) => ({ target: cToken }))

  const [marketsRes, underlyingTokensAddressesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.markets }),
    multicall({ ctx, calls: underlyingsCalls, abi: abi.underlying }),
  ])

  for (let i = 0; i < cTokensRes.length; i++) {
    const cToken = cTokensRes[i]
    const underlying = underlyingAddressByMarketAddress[cToken.toLowerCase()] || underlyingTokensAddressesRes[i].output
    const marketRes = marketsRes[i]

    if (!isSuccess(marketRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: cToken,
      collateralFactor: marketRes.output.collateralFactorMantissa,
      underlyings: [underlying],
    })
  }

  return contracts
}

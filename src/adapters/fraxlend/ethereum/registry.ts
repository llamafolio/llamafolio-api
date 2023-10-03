import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  collateralContract: {
    stateMutability: 'view',
    type: 'function',
    name: 'collateralContract',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  getAllPairAddresses: {
    inputs: [],
    name: 'getAllPairAddresses',
    outputs: [{ internalType: 'address[]', name: '_deployedPairsArray', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  maxLTV: {
    inputs: [],
    name: 'maxLTV',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPairsContracts(ctx: BaseContext, registry: `0x${string}`) {
  const contracts: Contract[] = []

  const pairs = await call({
    ctx,
    target: registry,
    abi: abi.getAllPairAddresses,
  })

  const [collateralContractsRes, LTVs] = await Promise.all([
    multicall({
      ctx,
      calls: pairs.map((address) => ({
        target: address,
      })),
      abi: abi.collateralContract,
    }),
    multicall({
      ctx,
      calls: pairs.map((address) => ({
        target: address,
      })),
      abi: abi.maxLTV,
    }),
  ])

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const collateralContractRes = collateralContractsRes[pairIdx]
    const LTV = LTVs[pairIdx]

    if (!collateralContractRes.success) {
      continue
    }

    const poolToken: Contract = {
      chain: ctx.chain,
      address: pair,
      underlyings: [collateralContractRes.output],
      collateralFactor: LTV.output != null ? LTV.output * 10n ** 13n : undefined,
    }

    contracts.push(poolToken)
  }

  return contracts
}

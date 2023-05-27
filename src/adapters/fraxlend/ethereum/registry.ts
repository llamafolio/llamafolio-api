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
} as const

export async function getPairsContracts(ctx: BaseContext, registry: `0x${string}`) {
  const contracts: Contract[] = []

  const pairs = await call({
    ctx,
    target: registry,
    abi: abi.getAllPairAddresses,
  })

  const collateralContractsRes = await multicall({
    ctx,
    calls: pairs.map((address) => ({
      target: address,
    })),
    abi: abi.collateralContract,
  })

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const collateralContractRes = collateralContractsRes[pairIdx]

    if (!collateralContractRes.success) {
      continue
    }

    const poolToken: Contract = {
      chain: ctx.chain,
      address: pair,
      underlyings: [collateralContractRes.output],
    }

    contracts.push(poolToken)
  }

  return contracts
}

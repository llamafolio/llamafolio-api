import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export async function getPairsContracts(ctx: BaseContext, registry: string) {
  const contracts: Contract[] = []

  const allPairAddressesRes = await call({
    ctx,
    target: registry,
    abi: abi.getAllPairAddresses,
  })

  const pairs: string[] = allPairAddressesRes.output

  const collateralContractsRes = await multicall({
    ctx,
    calls: pairs.map((address) => ({
      target: address,
      params: [],
    })),
    abi: abi.collateralContract,
  })

  for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
    const pair = pairs[pairIdx]
    const collateralContractRes = collateralContractsRes[pairIdx]

    if (!isSuccess(collateralContractRes)) {
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

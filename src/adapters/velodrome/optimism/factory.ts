import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import type { getPairsContractsParams as getUniswapPairsContractsParams } from '@lib/uniswap/v2/factory'
import { getPairsContracts as getUniswapPairsContracts } from '@lib/uniswap/v2/factory'

const abi = {
  stable: {
    inputs: [],
    name: 'stable',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPairsContracts({
  ctx,
  factoryAddress,
  offset = 0,
  limit = 100,
}: getUniswapPairsContractsParams) {
  const { pairs, allPairsLength } = await getUniswapPairsContracts({ ctx, factoryAddress, offset, limit })

  const stablesRes = await multicall({ ctx, calls: pairs.map((pair) => ({ target: pair.address })), abi: abi.stable })

  for (let pid = 0; pid < pairs.length; pid++) {
    const stableRes = stablesRes[pid]

    if (isSuccess(stableRes)) {
      pairs[pid].stable = stableRes.output
    }
  }

  return { pairs, allPairsLength }
}

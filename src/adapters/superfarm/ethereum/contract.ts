import type { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  getPoolCount: {
    inputs: [],
    name: 'getPoolCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenStrength', type: 'uint256' },
      { internalType: 'uint256', name: 'tokensPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'pointStrength', type: 'uint256' },
      { internalType: 'uint256', name: 'pointsPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolTokens',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getSuperfarmContracts(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  const pools: Contract[] = []
  const calls: Call[] = contracts.map((contract) => ({ target: contract.address }))

  const poolLengthRes = await multicall({ ctx, calls, abi: abi.getPoolCount })

  const [poolsTokensRes, pendingTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolLengthRes.flatMap((poolLength) =>
        isSuccess(poolLength)
          ? range(0, poolLength.output).map((_, idx) => ({ target: poolLength.input.target, params: [idx] }))
          : null,
      ),
      abi: abi.poolTokens,
    }),
    multicall({
      ctx,
      calls: poolLengthRes.flatMap((poolLength) =>
        isSuccess(poolLength) ? range(0, poolLength.output).map((_) => ({ target: poolLength.input.target })) : null,
      ),
      abi: abi.token,
    }),
  ])

  for (let idx = 0; idx < poolsTokensRes.length; idx++) {
    const poolsTokenRes = poolsTokensRes[idx]
    const pendingTokenRes = pendingTokensRes[idx]

    if (!isSuccess(poolsTokenRes) || !isSuccess(pendingTokenRes)) {
      continue
    }

    pools.push({
      chain: 'ethereum',
      address: poolsTokenRes.output,
      underlyings: [poolsTokenRes.output],
      rewards: [pendingTokenRes.output],
      staker: poolsTokenRes.input.target,
    })
  }

  const fmtPools = await getPairsDetails(ctx, pools)

  for (let i = 0; i < fmtPools.length; i++) {
    const contractIndex = pools.findIndex((pool) => pool.address === fmtPools[i].address)
    if (contractIndex !== -1) {
      pools[contractIndex] = Object.assign({}, pools[contractIndex], fmtPools[i])
    }
  }

  return pools
}

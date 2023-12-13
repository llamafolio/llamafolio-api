import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  debtToken: {
    inputs: [],
    name: 'debtToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  collToken: {
    inputs: [],
    name: 'getActiveYieldStrategies',
    outputs: [
      { internalType: 'uint256[]', name: '_indices', type: 'uint256[]' },
      { internalType: 'address[]', name: '_strategies', type: 'address[]' },
      { internalType: 'address[]', name: '_underlyingTokens', type: 'address[]' },
      { internalType: 'address[]', name: '_yieldTokens', type: 'address[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  crv_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'crv_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 3180,
  },
  lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'lp_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 3210,
  },
  curveLpToken: {
    inputs: [],
    name: 'curveLpToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCleLendContracts(ctx: BaseContext, cleLendAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [collTokensRes, debtToken] = await Promise.all([
    multicall({ ctx, calls: cleLendAddresses.map((address) => ({ target: address }) as const), abi: abi.collToken }),
    multicall({ ctx, calls: cleLendAddresses.map((address) => ({ target: address }) as const), abi: abi.debtToken }),
  ])

  return mapMultiSuccessFilter(
    collTokensRes.map((_, i) => [collTokensRes[i], debtToken[i]]),

    (res, index) => {
      const address = cleLendAddresses[index]
      const [{ output: collTokens }, { output: debtToken }] = res.inputOutputPairs

      const [_, __, ___, [token]] = collTokens

      return {
        chain: ctx.chain,
        address,
        token,
        underlyings: [debtToken],
      }
    },
  )
}

export async function getCleFarmContracts(ctx: BaseContext, getCleFarmAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [lpTokens, rewards] = await Promise.all([
    multicall({
      ctx,
      calls: getCleFarmAddresses.map((address) => ({ target: address }) as const),
      abi: abi.lp_token,
    }),
    multicall({
      ctx,
      calls: getCleFarmAddresses.map((address) => ({ target: address }) as const),
      abi: abi.crv_token,
    }),
  ])

  const curveTokens = await multicall({
    ctx,
    calls: mapSuccessFilter(lpTokens, (res) => ({ target: res.output }) as const),
    abi: abi.curveLpToken,
  })

  return mapMultiSuccessFilter(
    lpTokens.map((_, i) => [lpTokens[i], rewards[i]]),

    (res, index) => {
      const address = getCleFarmAddresses[index]
      const [{ output: token }, { output: reward }] = res.inputOutputPairs
      const curveToken = curveTokens[index].success ? curveTokens[index].output : token

      return {
        chain: ctx.chain,
        address,
        token: curveToken,
        underlyings: undefined,
        reward: [reward],
      }
    },
  )
}

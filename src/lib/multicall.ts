import '@lib/providers'

import { multiCall } from '@defillama/sdk/build/abi/index'
import { BaseContext } from '@lib/adapter'
import { CallParams } from '@lib/call'
import { isNotNullish } from '@lib/type'

export interface MultiCallOptions {
  ctx: BaseContext
  abi: any
  calls: (Call | null)[]
  target?: string
  chunkSize?: number
}

export interface Call {
  target?: string
  params?: CallParams
}

export interface MultiCallResult<T = string, P = any[], O = any | null> {
  success: boolean
  input: {
    target: T
    params: P
  }
  output: O
}

export async function multicall<T = string, P = any[], O = any>(params: MultiCallOptions) {
  const results: MultiCallResult<T, P, O>[] = []
  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls = params.calls.filter(isNotNullish)

  const multicallRes = await multiCall({
    ...params,
    calls,
    chain: params.ctx.chain,
    block: params.ctx.blockHeight,
  })

  // Build output by adding back nullish input calls
  let callIdx = 0
  for (let paramCallIdx = 0; paramCallIdx < params.calls.length; paramCallIdx++) {
    if (isNotNullish(params.calls[callIdx])) {
      results.push(multicallRes.output[callIdx] as MultiCallResult<T, P, O>)
      callIdx++
    } else {
      results.push({ input: params.calls[paramCallIdx], success: false, output: null } as MultiCallResult<T, P, O>)
    }
  }

  return results
}

import '@lib/providers'

import type { BaseContext } from '@lib/adapter'
import type { CallParams } from '@lib/call'
import { providers } from '@lib/providers'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'
import { getAddress } from 'viem'

export function formatValue(value: any): any {
  if (value == null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(formatValue)
  }

  if (typeof value === 'bigint' || typeof value === 'number' || BigNumber.isBigNumber(value)) {
    return value.toString()
  }

  return value
}

/**
 * Map viem outputs to ethers outputs for backwards compatibility
 * @param abi
 * @param output
 */
export function formatOutput(abi: any, output: any) {
  const out = formatValue(output)

  // add name getters
  if (Array.isArray(output)) {
    for (let outIdx = 0; outIdx < abi.outputs.length; outIdx++) {
      out[abi.outputs[outIdx].name] = out[outIdx]
    }
  }

  return out
}

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
  if (!params.calls?.length) {
    return results
  }

  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls = params.calls.filter(isNotNullish)

  const multicallRes = await providers[params.ctx.chain].multicall({
    contracts: calls.map((call) => ({
      address: getAddress((call.target || params.target)!),
      abi: [params.abi],
      functionName: params.abi.name,
      args: call.params || [],
    })),
  })

  // Build output by adding back nullish input calls
  let callIdx = 0
  for (let paramCallIdx = 0; paramCallIdx < params.calls.length; paramCallIdx++) {
    if (isNotNullish(params.calls[callIdx])) {
      results.push({
        input: params.calls[callIdx],
        success: multicallRes[callIdx].status === 'success',
        output: formatOutput(params.abi, multicallRes[callIdx].result),
      } as MultiCallResult<T, P, O>)
      callIdx++
    } else {
      results.push({ input: params.calls[paramCallIdx], success: false, output: null } as MultiCallResult<T, P, O>)
    }
  }

  return results
}

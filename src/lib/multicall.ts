import '@lib/providers'

import type { BaseContext } from '@lib/adapter'
import { providers } from '@lib/providers'
import { isNotNullish } from '@lib/type'
import type { Abi } from 'abitype'
import type { DecodeFunctionResultParameters, DecodeFunctionResultReturnType } from 'viem'

export interface Call<TAbi extends Abi[number] | readonly unknown[]> {
  target: `0x${string}`
  params?: DecodeFunctionResultParameters<TAbi[]>['args']
}

export type MultiCallResult<TAbi extends Abi[number] | readonly unknown[]> =
  | {
      success: true
      input: { target: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args']; enabled?: boolean }
      output: DecodeFunctionResultReturnType<TAbi[]>
    }
  | {
      success: false
      input: { target: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args']; enabled?: boolean }
      output: null
    }

export async function multicall<
  TAbi extends Abi[number] | readonly unknown[],
  Call extends { target?: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args']; enabled?: boolean },
  TAllowFailure extends boolean = true,
>(options: {
  ctx: BaseContext
  abi: DecodeFunctionResultParameters<TAbi[]>['abi'][number]
  calls: (Call | null)[]
  allowFailure?: TAllowFailure
}): Promise<
  (TAllowFailure extends false
    ? DecodeFunctionResultReturnType<TAbi[]>
    :
        | {
            success: true
            input: Call
            output: DecodeFunctionResultReturnType<TAbi[]>
          }
        | {
            success: false
            input: Call
            output: null
          })[]
> {
  const allowFailure = options.allowFailure != null ? options.allowFailure : true

  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls = options.calls.filter((call): call is Call => isNotNullish(call) && call.enabled !== false)

  const multicallRes = await providers[options.ctx.chain].multicall({
    // @ts-ignore
    contracts: calls.map((call) => ({
      address: call.target,
      abi: [options.abi],
      // @ts-ignore
      functionName: options.abi.name,
      args: call.params,
    })),
    allowFailure,
  })

  // Build output by adding back nullish input calls
  let callIdx = 0
  // @ts-ignore
  return options.calls.map((input, idx) => {
    if (input == null || input.enabled === false) {
      return { input: options.calls[idx], success: false, output: null }
    }

    const response = multicallRes[callIdx++] as any

    if (allowFailure) {
      return {
        input: options.calls[idx],
        success: response.status === 'success',
        output: response.result,
      }
    }

    return response
  })
}

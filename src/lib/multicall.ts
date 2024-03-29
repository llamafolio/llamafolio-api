import type { BaseContext } from '@lib/adapter'
import { call, toCacheKey } from '@lib/call'
import { isNotNullish } from '@lib/type'
import type { Abi } from 'abitype'
import type { AbiFunction, DecodeFunctionResultParameters, DecodeFunctionResultReturnType } from 'viem'

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
  const multicall3BlockCreated = options.ctx.client?.chain?.contracts?.multicall3?.blockCreated
  // Multicall3 not deployed yet, fallback to eth_call
  const fallbackEthCall =
    options.ctx.blockNumber != null &&
    multicall3BlockCreated != null &&
    options.ctx.blockNumber < multicall3BlockCreated

  const allowFailure = options.allowFailure != null ? options.allowFailure : true

  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls: Call[] = []
  for (const call of options.calls) {
    if (isNotNullish(call) && call.target != null && call.enabled !== false) {
      // Maybe cached
      if (options.ctx.cache) {
        call.__cache_key = toCacheKey(
          options.ctx,
          call.target!,
          options.abi as unknown as AbiFunction,
          call.params == null ? [] : Array.isArray(call.params) ? call.params : [call.params],
        )

        if (!options.ctx.cache.has(call.__cache_key)) {
          calls.push(call)
        }
      } else {
        calls.push(call)
      }
    }
  }

  const multicallRes = fallbackEthCall
    ? await Promise.all(
        calls.map(async (_call) => {
          try {
            const result = await call({
              ctx: options.ctx,
              abi: options.abi,
              target: _call.target!,
              enabled: _call.enabled,
              params: _call.params,
            })
            return {
              status: 'success',
              result,
            }
          } catch {
            return {
              status: 'failure',
              result: null,
            }
          }
        }),
      )
    : await options.ctx.client.multicall({
        // @ts-ignore
        contracts: calls.map((call) => ({
          address: call.target,
          abi: [options.abi],
          // @ts-ignore
          functionName: options.abi.name,
          args: call.params == null ? [] : Array.isArray(call.params) ? call.params : [call.params],
        })),
        blockNumber: options.ctx.blockNumber != null ? BigInt(options.ctx.blockNumber) : undefined,
        allowFailure,
      })

  // Build output by adding back nullish input calls
  let callIdx = 0
  // @ts-ignore
  return options.calls.map((input, idx) => {
    if (input == null || input.enabled === false || input.target == null) {
      return { input: options.calls[idx], success: false, output: null }
    }

    const response = multicallRes[callIdx++] as any

    // Try to read cache
    if (options.ctx.cache != null) {
      if (options.ctx.cache.has(options.calls[idx].__cache_key)) {
        return {
          input: options.calls[idx],
          success: true,
          output: options.ctx.cache.get(options.calls[idx].__cache_key),
        }
      }

      options.ctx.cache.set(options.calls[idx].__cache_key, response.result)
    }

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

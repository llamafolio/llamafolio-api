import '@lib/providers'

import type { BaseContext } from '@lib/adapter'
import { providers } from '@lib/providers'
import { isNotNullish } from '@lib/type'
import type { Abi } from 'abitype'
import type { DecodeFunctionResultParameters, DecodeFunctionResultReturnType } from 'viem'

/** @see https://github.com/mds1/multicall */
const MULTICALL_V3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

export interface Call<TAbi extends Abi[number] | readonly unknown[]> {
  target: `0x${string}`
  params?: DecodeFunctionResultParameters<TAbi[]>['args']
}

export type MultiCallResult<TAbi extends Abi[number] | readonly unknown[]> =
  | {
      success: true
      input: { target: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args'] }
      output: DecodeFunctionResultReturnType<TAbi[]>
    }
  | {
      success: false
      input: { target: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args'] }
      output: null
    }

export async function multicall<
  TAbi extends Abi[number] | readonly unknown[],
  Call extends { target: `0x${string}`; params?: DecodeFunctionResultParameters<TAbi[]>['args'] },
>(options: {
  ctx: BaseContext
  abi: DecodeFunctionResultParameters<TAbi[]>['abi'][number]
  calls: (Call | null)[]
}): Promise<
  (
    | {
        success: true
        input: Call
        output: DecodeFunctionResultReturnType<TAbi[]>
      }
    | {
        success: false
        input: Call
        output: null
      }
  )[]
> {
  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls = options.calls.filter(isNotNullish)

  const multicallRes = await providers[options.ctx.chain].multicall({
    multicallAddress: MULTICALL_V3_ADDRESS,
    // @ts-ignore
    contracts: calls.map((call) => ({
      address: call.target,
      abi: [options.abi],
      // @ts-ignore
      functionName: options.abi.name,
      args: call.params,
    })),
  })

  // Build output by adding back nullish input calls
  let callIdx = 0
  // @ts-ignore
  return options.calls.map((input, idx) => {
    if (input == null) {
      return { input: options.calls[idx], success: false, output: null }
    }

    const response = multicallRes[callIdx++]

    return {
      input: options.calls[idx],
      success: response.status === 'success',
      output: response.result,
    }
  })
}

import '@lib/providers'

import { multiCall } from '@defillama/sdk/build/abi/index'

export type MultiCallParams = Parameters<typeof multiCall>[0]

export type Calls = MultiCallParams['calls']
export type Call = Calls[number]

export interface MultiCallResult<T = string, P = any[], O = any | null> {
  success: boolean
  input: {
    target: T
    params: P
  }
  output: O
}

export async function multicall<T = string, P = any[], O = any>(params: MultiCallParams) {
  const multicallRes = await multiCall(params)

  return multicallRes.output as MultiCallResult<T, P, O>[]
}

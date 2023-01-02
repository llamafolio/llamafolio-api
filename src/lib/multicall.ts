import '@lib/providers'

import { multiCall } from '@defillama/sdk/build/abi/index'
import { BaseContext } from '@lib/adapter'
import { CallParams } from '@lib/call'

export interface MultiCallOptions {
  ctx: BaseContext
  abi: any
  calls: Call[]
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
  const multicallRes = await multiCall({
    ...params,
    chain: params.ctx.chain,
    block: params.ctx.blockHeight,
  })

  return multicallRes.output as MultiCallResult<T, P, O>[]
}

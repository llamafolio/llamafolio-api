import '@lib/providers'

import { BaseContext } from '@lib/adapter'
import { callers } from '@lib/multicall'

export type CallParams = string | number | (string | number)[] | undefined

export interface CallOptions {
  ctx: BaseContext
  target: string
  abi: any
  params?: CallParams
}

export async function call(options: CallOptions) {
  const res = await callers[options.ctx.chain]!.call({
    ...options,
    calls: [{ target: options.target, params: options.params }],
    chain: options.ctx.chain,
    block: options.ctx.blockHeight,
  })

  return res.output[0]
}

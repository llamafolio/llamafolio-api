import '@lib/providers'

import { call as sdkCall } from '@defillama/sdk/build/abi'
import { BaseContext } from '@lib/adapter'

export type CallParams = string | number | (string | number)[] | undefined

export interface CallOptions {
  ctx: BaseContext
  target: string
  abi: any
  params?: CallParams
}

export async function call(options: CallOptions) {
  const res = await sdkCall({
    ...options,
    chain: options.ctx.chain,
    block: options.ctx.blockHeight,
  })

  return res
}

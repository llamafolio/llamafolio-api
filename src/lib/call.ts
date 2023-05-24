import '@lib/providers'

import type { BaseContext } from '@lib/adapter'
import { formatOutput, formatValue } from '@lib/multicall'
import { providers } from '@lib/providers'
import { getAddress } from 'viem'

export type CallParams = string | number | (string | number)[] | undefined

export interface CallOptions {
  ctx: BaseContext
  target: string
  abi: any
  params?: CallParams
}

export async function call(options: CallOptions) {
  const args = options.params == null ? [] : Array.isArray(options.params) ? options.params : [options.params]

  const output = await providers[options.ctx.chain].readContract({
    address: getAddress(options.target),
    abi: [options.abi],
    functionName: options.abi.name,
    args,
  })

  if (options.abi.outputs.length === 1) {
    return { output: formatValue(output) }
  }

  return { output: formatOutput(options.abi, output) }
}

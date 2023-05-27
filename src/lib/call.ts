import '@lib/providers'

import type { BaseContext } from '@lib/adapter'
import { providers } from '@lib/providers'
import type { Abi } from 'abitype'
import type { DecodeFunctionResultParameters, DecodeFunctionResultReturnType } from 'viem'

export async function call<TAbi extends Abi[number] | readonly unknown[]>(options: {
  ctx: BaseContext
  target: `0x${string}`
  abi: DecodeFunctionResultParameters<TAbi[]>['abi'][number]
  params?: DecodeFunctionResultParameters<TAbi[]>['args']
}): Promise<DecodeFunctionResultReturnType<TAbi[]>> {
  const args = options.params == null ? [] : Array.isArray(options.params) ? options.params : [options.params]

  // @ts-ignore
  const output = await providers[options.ctx.chain].readContract({
    address: options.target,
    abi: [options.abi],
    // @ts-ignore
    functionName: options.abi.name,
    args,
  })

  return output as any
}

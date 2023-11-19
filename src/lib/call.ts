import type { BaseContext } from '@lib/adapter'
import { chainById } from '@lib/chains'
import type { Abi } from 'abitype'
import type { DecodeFunctionResultParameters, DecodeFunctionResultReturnType } from 'viem'

export async function call<TAbi extends Abi[number] | readonly unknown[]>(options: {
  ctx: BaseContext
  target: `0x${string}`
  abi: DecodeFunctionResultParameters<TAbi[]>['abi'][number]
  params?: DecodeFunctionResultParameters<TAbi[]>['args']
  enabled?: boolean
}): Promise<DecodeFunctionResultReturnType<TAbi[]>> {
  const args = options.params == null ? [] : Array.isArray(options.params) ? options.params : [options.params]

  // @ts-ignore
  const output = await chainById[options.ctx.chain].client.readContract({
    address: options.target,
    abi: [options.abi],
    // @ts-ignore
    functionName: options.abi.name,
    blockNumber: options.ctx.blockNumber != null ? BigInt(options.ctx.blockNumber) : undefined,
    args,
  })

  return output as any
}

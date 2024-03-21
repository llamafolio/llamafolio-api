import type { BaseContext } from '@lib/adapter'
import { chainById } from '@lib/chains'
import type { Abi } from 'abitype'
import {
  type AbiFunction,
  type DecodeFunctionResultParameters,
  type DecodeFunctionResultReturnType,
  toFunctionSelector,
} from 'viem'

export function toCacheKey(ctx: BaseContext, target: string, abi: AbiFunction, args?: any) {
  const selector = toFunctionSelector(abi)
  const chainId = chainById[ctx.chain].chainId
  const blockNumber = ctx.blockNumber || ''
  const params = args == null ? '' : JSON.stringify(args)

  return `${ctx.adapterId}#${chainId}#${target.toLowerCase()}#${selector.toLowerCase()}#${blockNumber}#${params}`
}

/**
 * NOTE: Cache calls results if the context contains has a valid `blockNumber` and `cache`
 * @param options
 */
export async function call<TAbi extends Abi[number] | readonly unknown[]>(options: {
  ctx: BaseContext
  target: `0x${string}`
  abi: DecodeFunctionResultParameters<TAbi[]>['abi'][number]
  params?: DecodeFunctionResultParameters<TAbi[]>['args']
  enabled?: boolean
}): Promise<DecodeFunctionResultReturnType<TAbi[]>> {
  const args = options.params == null ? [] : Array.isArray(options.params) ? options.params : [options.params]

  // Maybe cache
  if (options.ctx.cache) {
    const cacheKey = toCacheKey(options.ctx, options.target, options.abi as unknown as AbiFunction, args)

    if (options.ctx.cache.has(cacheKey)) {
      return options.ctx.cache.get(cacheKey) as any
    }
  }

  // @ts-ignore
  const output = await options.ctx.client.readContract({
    address: options.target,
    abi: [options.abi],
    // @ts-ignore
    functionName: options.abi.name,
    blockNumber: options.ctx.blockNumber != null ? BigInt(options.ctx.blockNumber) : undefined,
    args,
  })

  return output as any
}

import '@lib/providers'

import { multiCall } from '@defillama/sdk/build/abi/index'
import { BaseContext } from '@lib/adapter'
import { CallParams } from '@lib/call'
import { chains } from '@lib/chains'
import { isNotNullish } from '@lib/type'
import { ethers } from 'ethers'

export type MultiCallParams = Parameters<typeof multiCall>[0]

function abiObjectToString(abi: object) {
  const frag = ethers.utils.Fragment.fromObject(abi)
  return frag.format(ethers.utils.FormatTypes.full)
}

// Merge incoming calls/multicalls and dispatch results
class BatchCaller {
  _pendingBatchAggregator: NodeJS.Timer | null = null
  _pendingBatch: Array<{
    request: MultiCallParams
    resolve: (result: any) => void
    reject: (error: Error) => void
  }> | null = null

  call(request: MultiCallParams) {
    if (this._pendingBatch == null) {
      this._pendingBatch = []
    }

    const inflightRequest: any = { request, resolve: null, reject: null }

    const promise = new Promise((resolve, reject) => {
      inflightRequest.resolve = resolve
      inflightRequest.reject = reject
    })

    this._pendingBatch.push(inflightRequest)

    if (!this._pendingBatchAggregator) {
      // Schedule batch for next event loop + short duration
      this._pendingBatchAggregator = setTimeout(async () => {
        // Get the current batch and clear it, so new requests
        // go into the next batch
        const batch = this._pendingBatch || []
        this._pendingBatch = null
        this._pendingBatchAggregator = null

        // next batch:
        // group by ABIs and merge multicalls together
        const requestByAbi: { [key: string]: MultiCallParams } = {}
        // storage positions to trace back requests
        const requestStorage: { abiString: string; start: number }[] = []

        for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
          const inflightRequest = batch[batchIdx]
          const abiString = abiObjectToString(inflightRequest.request.abi)

          if (!requestByAbi[abiString]) {
            requestByAbi[abiString] = {
              // either all requesting the same block or none
              block: inflightRequest.request.block,
              abi: inflightRequest.request.abi,
              chain: inflightRequest.request.chain,
              calls: [],
            }
          }

          requestStorage[batchIdx] = {
            abiString,
            start: requestByAbi[abiString].calls.length,
          }

          // append new calls to the batch
          for (const call of inflightRequest.request.calls) {
            requestByAbi[abiString].calls.push(call)
          }
        }

        const abiStrings = Object.keys(requestByAbi)

        try {
          const results = await Promise.all(abiStrings.map((abiString) => multiCall(requestByAbi[abiString])))

          // map results back to their original requests
          for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
            const inflightRequest = batch[batchIdx]
            const output = []
            const storage = requestStorage[batchIdx]
            const abiStringIdx = abiStrings.indexOf(storage.abiString)
            // result of all batched calls slices with the same ABI
            const result = results[abiStringIdx]
            if (!result) {
              inflightRequest.reject(new Error())
            }

            for (let callIdx = 0; callIdx < inflightRequest.request.calls.length; callIdx++) {
              output.push(result.output[storage.start + callIdx])
            }

            inflightRequest.resolve({ output })
          }
        } catch (error) {
          for (const inflightRequest of batch) {
            inflightRequest.reject(error as Error)
          }
        }
      }, 10)
    }

    return promise
  }
}

export const batchCallers: { [key: string]: BatchCaller } = {}
for (const chain of chains) {
  batchCallers[chain.id] = new BatchCaller()
}

export interface MultiCallOptions {
  ctx: BaseContext
  abi: any
  calls: (Call | null)[]
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
  const results: MultiCallResult<T, P, O>[] = []
  if (!params.calls?.length) {
    return results
  }

  // Allow nullish input calls but don't pass them to the underlying multicall function.
  // Nullish calls results are automatically unsuccessful.
  // This allows us to "chain" multicall responses while preserving input indices
  const calls = params.calls.filter(isNotNullish)

  // chain not supported
  if (!batchCallers[params.ctx.chain]) {
    console.error(`Chain ${params.ctx.chain} not supported yet`)
    for (let callIdx = 0; callIdx < calls.length; callIdx++) {
      results.push({ input: params.calls[callIdx], success: false, output: null } as MultiCallResult<T, P, O>)
    }

    return results
  }

  const multicallRes = await batchCallers[params.ctx.chain].call({
    ...params,
    calls,
    chain: params.ctx.chain,
    block: params.ctx.blockHeight,
  })

  // Build output by adding back nullish input calls
  let callIdx = 0
  for (let paramCallIdx = 0; paramCallIdx < params.calls.length; paramCallIdx++) {
    if (isNotNullish(params.calls[callIdx])) {
      results.push(multicallRes.output[callIdx] as MultiCallResult<T, P, O>)
      callIdx++
    } else {
      results.push({ input: params.calls[paramCallIdx], success: false, output: null } as MultiCallResult<T, P, O>)
    }
  }

  return results
}

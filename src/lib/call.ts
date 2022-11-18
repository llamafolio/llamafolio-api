import '@lib/providers'

import { call as sdkCall } from '@defillama/sdk/build/abi'

export type TCall = Parameters<typeof sdkCall>[0]

export async function call(options: TCall) {
  const res = await sdkCall(options)

  return res
}

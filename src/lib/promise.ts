export interface PromiseFulfilledResult<T> {
  status: 'fulfilled'
  value: T
}

export interface PromiseRejectedResult {
  status: 'rejected'
  reason: any
}

export type PromiseSettledResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult

export const isFulfilled = <T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> =>
  promise.status === 'fulfilled'

export const isRejected = <T>(promise: PromiseSettledResult<T>): promise is PromiseRejectedResult =>
  promise.status === 'rejected'

export function timeout<T>(promise: Promise<T>, ms = 10_000, timeoutError = new Error('timeout')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError)
    }, ms)
  })

  return Promise.race<T>([promise, timeout])
}

// https://jasonformat.com/javascript-sleep/
export function sleep(milliseconds: number) {
  if (typeof Atomics === 'undefined') {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

export function timeout<T>(promise: Promise<T>, ms = 10_000, timeoutError = new Error('timeout')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError)
    }, ms)
  })

  return Promise.race<T>([promise, timeout])
}

// https://jasonformat.com/javascript-sleep/
export function sleep(milliseconds: number): void {
  if (typeof Atomics === 'undefined') {
    new Promise((resolve) => setTimeout(resolve, milliseconds))
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

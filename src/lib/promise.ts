export function timeout<T>(promise: Promise<T>, ms = 10_000, timeoutError = new Error('timeout')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError)
    }, ms)
  })

  return Promise.race<T>([promise, timeout])
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

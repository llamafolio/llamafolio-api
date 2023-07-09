/** Error handling utilities */
export function raise(error: unknown): never {
  throw typeof error === 'string' ? new Error(error) : error
}

export function invariant(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    const error = new Error(message ?? 'Invariant violation')
    Error.captureStackTrace?.(error, invariant)
    throw error
  }
}

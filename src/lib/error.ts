/**
 * Error utilities
 */

export function raise(error: unknown): never {
  console.error('raise', error)
  throw new Error(typeof error === 'string' ? error : JSON.stringify(error, undefined, 2))
}

import { environment } from '@environment'

const isProduction = environment.NODE_ENV === 'production'

const prefix = 'Invariant failed' satisfies string

/**
 * @see https://github.com/alexreardon/tiny-invariant [credit]
 * ```ts
 * invariant(truthyValue, 'This should not throw!');
 *
 * invariant(falsyValue, 'This will throw!');
 */
export const invariant = (condition: unknown, message?: string | (() => string)): asserts condition => {
  if (condition) return
  if (isProduction) throw new Error(prefix)
  const provided = typeof message === 'function' ? message() : message
  const value = provided ? `${prefix}: ${provided}` : prefix
  throw new Error(value)
}

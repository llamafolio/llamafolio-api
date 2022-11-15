export function isNotNullish<T>(argument: T | undefined | null): argument is T {
  return argument != null
}

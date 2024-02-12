export interface Cache<K extends string | number, V> {
  has(key: K): boolean
  set(key: K, value: V): void
  get(key: K): V | undefined
}

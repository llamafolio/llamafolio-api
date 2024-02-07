export interface Cache<K extends string | number, V> {
  set(key: K, value: V, ttl?: number): void
  get<U extends V>(key: K): U | null
}

export class InMemoryCache<K extends string | number, V> implements Cache<K, V> {
  cache = new Map<K, { value: V; expire?: number }>()

  /**
   * @param key
   * @param value
   * @param expire expiration time (seconds)
   */
  set(key: K, value: V, ttl?: number) {
    this.cache.set(key, { value, expire: ttl != null ? 1000 * ttl + Date.now() : undefined })
  }

  /**
   * @param key
   * @return `null` if cache hit missed
   */
  get<U extends V>(key: K): U | null {
    if (!this.cache.has(key)) {
      return null
    }

    const record = this.cache.get(key)!

    if (!record.expire || record.expire > Date.now()) {
      return record.value as U
    }

    this.cache.delete(key)
    return null
  }
}

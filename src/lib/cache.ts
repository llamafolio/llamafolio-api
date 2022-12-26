export class Cache<K extends string | number, V> {
  cache = new Map<K, { value: V; expire: number }>()

  /**
   * @param key
   * @param value
   * @param expire expiration time (seconds)
   */
  set(key: K, value: V, ttl: number) {
    const expire = 1000 * ttl + Date.now()
    this.cache.set(key, { value, expire })
  }

  /**
   * @param key
   */
  get(key: K) {
    const record = this.cache.get(key)
    if (!record) {
      return null
    }

    if (!record.expire || record.expire > Date.now()) {
      return record.value
    }

    this.cache.delete(key)
    return null
  }
}

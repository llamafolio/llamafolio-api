import { adapters } from '@adapters/index'
import { groupBy } from '@lib/array'
import { fetchProtocolsLite, IProtocolLite } from '@lib/protocols'

describe('metadata basic validations', () => {
  let protocolById: { [key: string]: any } = {}
  let protocols: IProtocolLite[] = []

  beforeAll(async () => {
    protocols = await fetchProtocolsLite()
    protocolById = groupBy(protocols, 'slug')
  })

  test('adapter protocol must exist on defillama', () => {
    for (const adapter of adapters) {
      // wallet is a special adapter, it doesn't exist on DefiLlama
      if (adapter.id === 'wallet') {
        continue
      }
      const protocol = protocolById[adapter.id]
      expect(protocol).toBeDefined()
    }
  })

  test('adapter ids must be unique', () => {
    const uniqueIds = new Set(adapters.map((adapter) => adapter.id))
    expect(uniqueIds.size).toEqual(adapters.length)
  })
})

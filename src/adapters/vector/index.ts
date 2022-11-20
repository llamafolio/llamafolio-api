import * as avax from '@adapters/vector/avax'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'vector-finance',
  getContracts: avax.getContracts,
  getBalances: avax.getBalances,
}

export default adapter

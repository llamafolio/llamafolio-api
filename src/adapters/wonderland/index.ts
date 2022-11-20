import * as avax from '@adapters/wonderland/avax'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'wonderland',
  getContracts: avax.getContracts,
  getBalances: avax.getBalances,
}

export default adapter

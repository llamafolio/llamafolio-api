import * as avax from '@adapters/life-dao/avax'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'life-dao',
  getContracts: avax.getContracts,
  getBalances: avax.getBalances,
}

export default adapter

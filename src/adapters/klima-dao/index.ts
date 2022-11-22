import * as polygon from '@adapters/klima-dao/polygon'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'klima-dao',
  getContracts: polygon.getContracts,
  getBalances: polygon.getBalances,
}

export default adapter

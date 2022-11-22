import * as ethereum from '@adapters/floor-dao/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'floor-dao',
  getContracts: ethereum.getContracts,
  getBalances: ethereum.getBalances,
}

export default adapter

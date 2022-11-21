import * as ethereum from '@adapters/olympus-dao/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'olympus-dao',
  getContracts: ethereum.getContracts,
  getBalances: ethereum.getBalances,
}

export default adapter

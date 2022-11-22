import * as ethereum from '@adapters/compound/v3/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'compound-v3',
  getContracts: ethereum.getContracts,
  getBalances: ethereum.getBalances,
}

export default adapter

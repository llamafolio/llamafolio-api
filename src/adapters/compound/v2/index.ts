import * as ethereum from '@adapters/compound/v2/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'compound',
  getContracts: ethereum.getContracts,
  getBalances: ethereum.getBalances,
}

export default adapter

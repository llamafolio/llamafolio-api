import * as bsc from '@adapters/venus/bsc'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'venus',
  getContracts: bsc.getContracts,
  getBalances: bsc.getBalances,
}

export default adapter

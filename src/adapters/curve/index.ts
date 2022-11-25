import * as avax from '@adapters/curve/avax'
import * as ethereum from '@adapters/curve/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'curve',
  avax,
  ethereum,
}

export default adapter

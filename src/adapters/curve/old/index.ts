import * as ethereum from '@adapters/curve-v2/ethereum'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'curve-v2',

  ethereum,
}

export default adapter

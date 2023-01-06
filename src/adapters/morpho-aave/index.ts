import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'morpho-aave',
  ethereum,
}

export default adapter

import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'uniswap-v3',
  ethereum,
}

export default adapter

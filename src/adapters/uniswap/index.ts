import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'uniswap',

  ethereum,
}

/**
 *
 * TODO: Uniswap v3 Logics
 *
 */

export default adapter

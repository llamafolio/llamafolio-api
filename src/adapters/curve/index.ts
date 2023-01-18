import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'curve',
  ethereum,
}

/**
 * TODO:
 * - Extra rewards logics on ethereum
 * - Altchains
 */

export default adapter

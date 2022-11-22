import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'alpaca-finance',
  bsc,
  fantom,
}

export default adapter

import { Adapter } from '@lib/adapter'

import * as bsc from './bsc'
import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'yoshi-exchange',
  fantom,
  bsc,
}

export default adapter

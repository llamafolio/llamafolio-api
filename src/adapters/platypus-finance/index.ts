import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'platypus-finance',
  avax,
}

export default adapter

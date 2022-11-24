import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'wonderland',
  avax,
}

export default adapter

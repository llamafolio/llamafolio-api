import { Adapter } from '@lib/adapter'

import * as avalanche from './avalanche'

const adapter: Adapter = {
  id: 'life-dao',
  avalanche,
}

export default adapter

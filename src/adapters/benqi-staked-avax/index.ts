import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'benqi-staked-avax',
  avax,
}

export default adapter

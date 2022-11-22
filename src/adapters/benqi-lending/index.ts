import { Adapter } from '@lib/adapter'

import * as avax from './avax'

const adapter: Adapter = {
  id: 'benqi-lending',
  avax,
}

export default adapter

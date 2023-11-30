import type { Adapter } from '@lib/adapter'

import * as linea from './linea'

const adapter: Adapter = {
  id: 'mendi-finance',
  linea: linea,
}

export default adapter

import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'the-open-dao-sos',
  ethereum,
}

export default adapter

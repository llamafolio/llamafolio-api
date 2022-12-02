import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'

const adapter: Adapter = {
  id: 'maple',
  ethereum,
}

// TODO: Maple Stake, we need to find a way to get Balancer Pools

export default adapter

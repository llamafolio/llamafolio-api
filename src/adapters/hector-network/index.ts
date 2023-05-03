import type { Adapter } from '@lib/adapter'

import * as fantom from './fantom'

const adapter: Adapter = {
  id: 'hector-network',
  fantom,
}

// TODO : Locked
// https://docs.hector.network/hector-network/introduction

export default adapter

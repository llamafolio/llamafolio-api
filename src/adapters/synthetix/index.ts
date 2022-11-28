import { Adapter } from '@lib/adapter'

import * as ethereum from './ethereum'
// import * as optimism from './optimism'

const adapter: Adapter = {
  id: 'synthetix',
  ethereum,
  // optimism,
}

// TODO: Farm parts using Curve logic, HealthFactor
// https://docs.synthetix.io/

export default adapter

import { Adapter } from '@lib/adapter'

import * as arbitrum from './arbitrum'
import * as polygon from './polygon'

const adapter: Adapter = {
  id: 'gains-network',
  arbitrum,
  polygon,
}

// TODO: Perpertuals on both polygon + arb + find logic on stake rewards

export default adapter

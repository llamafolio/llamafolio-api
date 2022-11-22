import * as arbitrum from '@adapters/aave/v3/arbitrum'
import * as avax from '@adapters/aave/v3/avax'
import * as fantom from '@adapters/aave/v3/fantom'
import * as polygon from '@adapters/aave/v3/polygon'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'aave-v3',
  arbitrum,
  avax,
  fantom,
  polygon,
}

export default adapter

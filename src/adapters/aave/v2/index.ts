import * as avax from '@adapters/aave/v2/avax'
import * as ethereum from '@adapters/aave/v2/ethereum'
import * as polygon from '@adapters/aave/v2/polygon'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'aave-v2',
  avax,
  ethereum,
  polygon,
}

export default adapter

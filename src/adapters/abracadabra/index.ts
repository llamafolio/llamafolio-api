import * as avax from '@adapters/abracadabra/avax'
import * as ethereum from '@adapters/abracadabra/ethereum'
import * as fantom from '@adapters/abracadabra/fantom'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'abracadabra',
  avax,
  ethereum,
  fantom,
}

// TODO: healthfactor
// https://docs.abracadabra.money/

export default adapter

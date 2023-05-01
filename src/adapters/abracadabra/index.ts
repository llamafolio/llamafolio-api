import * as arbitrum from '@adapters/abracadabra/arbitrum'
import * as avalanche from '@adapters/abracadabra/avalanche'
import * as ethereum from '@adapters/abracadabra/ethereum'
import * as fantom from '@adapters/abracadabra/fantom'
import { Adapter } from '@lib/adapter'

const adapter: Adapter = {
  id: 'abracadabra',
  avalanche,
  ethereum,
  fantom,
  arbitrum,
}

// TODO: healthfactor
// Abracadabra is restructuring its docs to be more readable for developpers
// https://docs.abracadabra.money/

export default adapter

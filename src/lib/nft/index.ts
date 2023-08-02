export * from './defillama'
export * from './types'
import {
  batchFetchMetadata as batchFetchMetadataFromAlchemy,
  fetchUserNFTs as fetchUserNFTsFromAlchemy,
} from './alchemy'
import { fetchUserNFTs as fetchUserNFTsFromAnkr } from './ankr'
import {
  //
  batchFetchMetadata as batchFetchMetadataFromCenter,
  fetchUserNFTs as fetchUserNFTsFromCenter,
} from './center'
import { fetchUserNFTs as fetchUserNFTsFromInfura } from './infura'
import { fetchUserNFTs as fetchUserNFTsFromNftPort } from './nft-port'
import {
  batchFetchMetadata as batchFetchMetadataFromNftScan,
  fetchUserNFTCollections as fetchUserNFTCollectionsFromNftScan,
  fetchUserNFTs as fetchUserNFTsFromNftScan,
} from './nft-scan'
import {
  batchFetchMetadataFromQuickNode,
  batchFetchNFTTradingHistoryFromQuickNode,
  fetchUserNFTsFromQuickNode,
} from './quick-node'
import {
  fetchUserNFTCollections as fetchUserNFTCollectionsFromReservoir,
  fetchUsersNFTActivity as fetchUsersNFTActivityFromReservoir,
} from './reservoir'
import { fetchUserNFTs as fetchUserNFTsFromSequence } from './sequence'

export const fetchUserNFTsFrom = {
  alchemy: fetchUserNFTsFromAlchemy,
  infura: fetchUserNFTsFromInfura,
  ankr: fetchUserNFTsFromAnkr,
  nftPort: fetchUserNFTsFromNftPort,
  nftScan: fetchUserNFTsFromNftScan,
  sequence: fetchUserNFTsFromSequence,
  center: fetchUserNFTsFromCenter,
  quickNode: fetchUserNFTsFromQuickNode,
}

export const fetchNFTMetadataFrom = {
  center: batchFetchMetadataFromCenter,
  alchemy: batchFetchMetadataFromAlchemy,
  nftScan: batchFetchMetadataFromNftScan,
  quickNode: batchFetchMetadataFromQuickNode,
}

export const fetchUserNFTCollectionsFrom = {
  reservoir: fetchUserNFTCollectionsFromReservoir,
  nftScan: fetchUserNFTCollectionsFromNftScan,
}

export const fetchUserNFTActivityFrom = {
  reservoir: fetchUsersNFTActivityFromReservoir,
}

export const fetchNFTTradingHistoryFrom = {
  quickNode: batchFetchNFTTradingHistoryFromQuickNode,
}

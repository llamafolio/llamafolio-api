/**
 * All NFT fetchers should have this interface as a base for returned data
 */

import type { Address } from 'viem'

export interface WalletNFTs {
  address: Address
  nfts: NFT[]
}

export interface NFT {
  contractAddress: string
  tokenId: string
  name: string
  description: string
  imageURL: string
  chain: string
  contractType: 'ERC721' | 'ERC1155' | String
  count: number
}

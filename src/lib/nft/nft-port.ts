import environment from '@environment'
import { raise } from '@lib/error'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { WalletNFTs } from './types'

export async function fetchUserNFTsFromNftPort(
  address: string,
  options: {
    chain: 'ethereum' | 'polygon' | 'goerli'
    pageSize?: number
    continuation?: string
    include?: ['default', 'metadata', 'file_information', 'contract_information']
    exclude?: ['erc721', 'erc1155']
    contractAddress?: string
  } = {
    chain: 'ethereum',
    pageSize: 100,
    continuation: '',
  },
): Promise<WalletNFTs> {
  const API_KEY = environment.NFT_PORT_API_KEY ?? raise('Missing NFT_PORT_API_KEY')
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const queryParameters = new URLSearchParams(JSON.parse(JSON.stringify(options)))
  const response = await fetch(`https://api.nftport.xyz/v0/accounts/${walletAddress}?${queryParameters}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: API_KEY,
    },
  })
  if (!response.ok) {
    raise(`${response.status} - Failed to fetch from NFT Port: ${response.statusText}`)
  }
  const data = (await response.json()) as NftPortResponse
  if (data.response === 'NOK') {
    raise(`NFT Port response: ${data.response}`)
  }
  return {
    address: walletAddress,
    nfts: data.nfts.map((nft) => ({
      contractAddress: nft.contract_address,
      tokenId: nft.token_id,
      name: nft.name ?? nft.metadata?.name ?? '',
      description: nft.description ?? nft.metadata?.description ?? '',
      imageURL: nft.file_url ?? nft.cached_file_url ?? nft.animation_url ?? nft.cached_animation_url ?? '',
      chain: options.chain,
      contractType: nft.contract.type,
      count: 1,
    })),
  }
}

interface NftPortResponse {
  response: 'OK' | 'NOK'
  nfts: Array<{
    contract_address: Address
    token_id: string
    name?: string
    description?: string
    file_url?: string
    animation_url?: string
    cached_file_url?: string
    cached_animation_url?: string
    creator_address: string
    metadata?: {
      artist?: string
      aspect_ratio?: number
      collection_name?: string
      curation_status?: string
      description: string
      external_url?: string
      features?: {
        Chance: string
        Chaos: string
        'Colour Set': number
        Force: string
        Mass: string
        Saturation: string
        Symmetry: string
        Turbulence: string
      }
      generator_url?: string
      image: string
      is_static?: boolean
      license?: string
      minted?: boolean
      name?: string
      payout_address?: string
      platform?: string
      project_id?: string
      royaltyInfo?: {
        additionalPayee: string
        additionalPayeePercentage: number
        artistAddress: string
        royaltyFeeByID: number
      }
      script_type?: string
      series?: number
      tokenID?: string
      token_hash?: string
      traits?: Array<{
        trait_type: string
        value: string
      }>
      website?: string
      attributes?: Array<{
        trait_type: string
        value: any
        display_type?: string
      }>
      animation_url?: string
      tokenId?: number
      file_link?: string
      compiler?: string
      iframe_url?: string
      license_terms?: string
      mb1_portrait?: string
      original_image?: string
      sprite_sheet?: string
      vrm?: string
      external_link?: string
    }
    metadata_url?: string
    file_information?: {
      height: number
      width: number
      file_size: number
    }
    contract: {
      name: string
      symbol: string
      type: string
      metadata: any
    }
  }>
  total: number
  continuation: string
}

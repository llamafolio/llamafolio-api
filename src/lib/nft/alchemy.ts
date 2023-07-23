import { environment } from '@environment'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import { type Address, getAddress } from 'viem'

const alchemyChain: {
  [chain: string]: string
} = {
  ethereum: 'eth-mainnet',
  polygon: 'polygon-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
}

export const ALCHEMY_BASE_URL = (chain: Chain) => `https://${alchemyChain[chain]}.g.alchemy.com`

/** groups Alchemy NFTs by collection contract address */
export function groupAlchemyNFTs(nfts: Array<AlchemyNFTWithMetadata>) {
  return nfts.reduce((accumulator, item) => {
    const {
      contract: { address: key },
      ...nft
    } = item

    if (!accumulator[key]) {
      accumulator[key] = {
        ...item.contract,
        balance: Number(item.balance),
        nfts: [],
      }
    }
    accumulator[key].balance += Number(item.balance)
    accumulator[key].nfts.push(nft)
    return accumulator
  }, {} as Record<string, AlchemyNFTWithMetadata['contract'] & { balance: number; nfts: Array<Omit<AlchemyNFTWithMetadata, 'contract'>> }>)
}

// https://docs.alchemy.com/reference/getnftsforowner-v3
export async function fetchUserNFTs<T extends boolean = false>({
  address,
  chain = 'ethereum',
  withMetadata,
  excludeFilters = ['SPAM'],
  spamConfidenceLevel = 'MEDIUM',
  contractAddresses,
  tokenUriTimeoutInMs = 0,
  pageSize = 100,
  pageKey,
}: {
  address: Address
  chain?: Chain
  withMetadata?: T
  contractAddresses?: Array<Address>
  excludeFilters?: Array<'SPAM' | 'AIRDROPS'>
  spamConfidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  tokenUriTimeoutInMs?: number
  pageKey?: string
  pageSize?: number
}) {
  const API_KEY = environment.ALCHEMY_API_KEY ?? raise('Missing ALCHEMY_API_KEY')
  const walletAddress = getAddress(address) ?? raise(`Invalid address: ${address}`)
  const queryParameters = urlSearchParams({
    owner: walletAddress,
    withMetadata: Boolean(withMetadata),
    spamConfidenceLevel,
    tokenUriTimeoutInMs,
    pageSize,
    pageKey,
  })
  excludeFilters.forEach((filter) => queryParameters.append('excludeFilters[]', filter))
  contractAddresses?.forEach((address) => queryParameters.append('contractAddresses[]', address))
  const url = `${ALCHEMY_BASE_URL(chain)}/nft/v3/${API_KEY}/getNFTsForOwner?${queryParameters}`
  type NFT = T extends true ? AlchemyNFTWithMetadata : AlchemyNFT
  const data = await fetcher<AlchemyUserNFTs<NFT> | AlchemyError>(url)

  if ('error' in data) {
    raise(`[alchemy] error for url ${url}: ${JSON.stringify(data, undefined, 2)}`)
  }

  return data
}

/**
 * This is automatically included in the response of `fetchUserNFTsFromAlchemy`
 * https://docs.alchemy.com/reference/getnftmetadatabatch-v3
 */
export async function batchFetchMetadata({
  chain = 'ethereum',
  tokens,
  tokenUriTimeoutInMs,
  refreshCache = false,
}: {
  chain?: Chain
  tokens: Array<{
    contractAddress?: string
    tokenId: string
    tokenType?: 'ERC721' | 'ERC1155'
  }>
  tokenUriTimeoutInMs?: number
  refreshCache?: boolean
}) {
  const API_KEY = environment.ALCHEMY_API_KEY ?? raise('Missing ALCHEMY_API_KEY')
  const url = `${ALCHEMY_BASE_URL(chain)}/nft/v3/${API_KEY}/getNFTMetadataBatch`
  const data = await fetcher<AlchemyNftMetadata[] | AlchemyError>(url, {
    method: 'POST',
    body: JSON.stringify({ tokens, tokenUriTimeoutInMs, refreshCache }),
  })
  return data
}

/**
 * This is automatically included in the response of `fetchUserNFTsFromAlchemy`
 * https://docs.alchemy.com/reference/getcontractmetadatabatch-v3
 */
export async function alchemyGetContractMetadataBatch({
  chain = 'ethereum',
  contractAddresses,
}: {
  chain?: Chain
  contractAddresses: Array<string>
}) {
  const API_KEY = environment.ALCHEMY_API_KEY ?? raise('Missing ALCHEMY_API_KEY')
  const url = `${ALCHEMY_BASE_URL(chain)}/nft/v3/${API_KEY}/getContractMetadataBatch`
  const addresses = contractAddresses.map(getAddress) ?? raise('Invalid address')
  const data = await fetcher<AlchemyContractMetadata[] | AlchemyError>(url, {
    method: 'POST',
    body: JSON.stringify({ contractAddresses: addresses }),
  })
  return data
}

// https://docs.alchemy.com/reference/computerarity-v3
export async function alchemyComputeNftAttributesRarity({
  chain = 'ethereum',
  contractAddress,
  tokenId,
}: {
  chain?: Chain
  contractAddress: string
  tokenId: string
}) {
  const API_KEY = environment.ALCHEMY_API_KEY ?? raise('Missing ALCHEMY_API_KEY')
  const queryParameters = urlSearchParams({
    contractAddress,
    tokenId,
  })
  const url = `${ALCHEMY_BASE_URL(chain)}/nft/v3/${API_KEY}/computeRarity?${queryParameters}`
  const data = await fetcher<AlchemyNftRarity | AlchemyError>(url)
  return data
}

interface AlchemyUserNFTs<T> {
  ownedNfts: Array<T>
  totalCount: number
  validAt: {
    blockNumber: number
    blockHash: string
    blockTimestamp: string
  }
  pageKey: string
}

interface AlchemyError {
  error: {
    message: string
  }
}

export interface AlchemyNFT {
  contractAddress: Address
  tokenId: string
  balance: string
}

export interface AlchemyNFTWithMetadata {
  contract: AlchemyNftMetadata['contract']
  tokenId: string
  tokenType: string
  name: string
  description: string
  image: {
    cachedUrl: string
    thumbnailUrl: string
    pngUrl: string
    contentType: string
    size: number
    originalUrl: string
  }
  raw: {
    tokenUri: string
    metadata: {
      name: string
      description: string
      image: string
      external_url: string
      attributes: Array<{
        value: string
        trait_type: string
      }>
    }
    error: any
  }
  tokenUri: string
  timeLastUpdated: string
  balance: string
}

export interface AlchemyNftMetadata {
  contract: AlchemyContractMetadata & {
    isSpam: string
    classifications: Array<string>
  }
  name: string
  description: string
  image: {
    cachedUrl: string
    thumbnailUrl: string
    pngUrl: string
    contentType: string
    size: number
    originalUrl: string
  }
  raw: {
    tokenUri: string
    metadata: {
      image: string
      name: string
      description: string
      attributes: Array<{
        value: string
        trait_type: string
      }>
    }
    error: string
  }
  tokenUri: string
  timeLastUpdated: string
  acquiredAt: {
    blockTimestamp: string
    blockNumber: string
  }
}

export interface AlchemyContractMetadata {
  address: string
  name: string
  symbol: string
  totalSupply: string
  tokenType: string
  contractDeployer: string
  deployedBlockNumber: number
  openSeaMetadata: {
    floorPrice: number | null
    collectionName: string
    safelistRequestStatus: string
    imageUrl: string
    description: string
    externalUrl: string
    twitterUsername: string
    discordUrl: string
    lastIngestedAt: string
  }
}

export interface AlchemyNftRarity {
  rarities: Array<{
    trait_type: string
    value: string
    prevalence: number
  }>
}

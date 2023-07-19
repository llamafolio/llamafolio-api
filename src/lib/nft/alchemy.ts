import { environment } from '@environment'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import { type Address, getAddress } from 'viem'

export const alchemyChain: {
  [chain: string]: string
} = {
  ethereum: 'eth-mainnet',
  polygon: 'polygon-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
}

export const ALCHEMY_BASE_URL = (chain: Chain) => `https://${alchemyChain[chain]}.g.alchemy.com`

/** groups Alchemy NFTs by collection contract address */
export function groupAlchemyNFTs(nfts: Array<AlchemyNFT>) {
  return nfts.reduce((accumulator, item) => {
    const key = item.contract.address
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(item)
    return accumulator
  }, {} as Record<string, (typeof nfts)[0][]>)
}

// https://docs.alchemy.com/reference/getnftsforowner-v3
export async function fetchUserNFTsFromAlchemy({
  address,
  chain = 'ethereum',
  withMetadata = true,
  excludeFilters = ['SPAM'],
  spamConfidenceLevel = 'MEDIUM',
  contractAddresses,
  tokenUriTimeoutInMs = 0,
  pageSize = 100,
  pageKey,
}: {
  address: Address
  chain?: Chain
  withMetadata?: boolean
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
    withMetadata,
    spamConfidenceLevel,
    tokenUriTimeoutInMs,
    pageSize,
    pageKey,
  })
  excludeFilters.forEach((filter) => queryParameters.append('excludeFilters[]', filter))
  contractAddresses?.forEach((address) => queryParameters.append('contractAddresses[]', address))

  const url = `${ALCHEMY_BASE_URL(chain)}/nft/v3/${API_KEY}/getNFTsForOwner?${queryParameters}`
  const data = await fetcher<AlchemyAccountNftsResponse | AlchemyError>(url)

  if ('error' in data) {
    raise(`[alchemy] error for url ${url}: ${JSON.stringify(data, undefined, 2)}`)
  }

  return data
}

interface AlchemyAccountNftsResponse {
  ownedNfts: Array<AlchemyNFT>
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

interface AlchemyNFT {
  contract: {
    address: string
    name: string
    symbol: string
    totalSupply?: string
    tokenType: string
    contractDeployer: string
    deployedBlockNumber: number
    openSeaMetadata: {
      floorPrice: any
      collectionName: string
      safelistRequestStatus: string
      imageUrl: string
      description: string
      externalUrl: string
      twitterUsername: any
      discordUrl: any
      lastIngestedAt: string
    }
    isSpam: boolean
    spamClassifications: Array<string>
  }
  tokenId: string
  tokenType: string
  name: any
  description: any
  image: {
    cachedUrl: any
    thumbnailUrl: any
    pngUrl: any
    contentType: any
    size: any
    originalUrl: any
  }
  raw: {
    tokenUri?: string
    metadata: Record<string, any>
    error: string
  }
  tokenUri?: string
  timeLastUpdated: string
  balance: string
  acquiredAt: {
    blockTimestamp: any
    blockNumber: any
  }
}

import { environment } from '@environment'
import { raise } from '@lib/error'
import { fetcher, urlSearchParams } from '@lib/fetcher'
import type { Address, Hex } from 'viem'
import { getAddress } from 'viem'

const RESERVOIR_BASE_URL = `https://api.reservoir.tools`
const RESERVOIR_API_KEY = environment.RESERVOIR_API_KEY ?? raise('Missing RESERVOIR_API_KEY')
const AUTH_HEADER = { 'X-API-KEY': RESERVOIR_API_KEY }

// https://docs.reservoir.tools/reference/getusersactivityv6
export async function fetchUsersNFTActivity<T extends boolean>({
  users,
  collection,
  limit = 1_000,
  sortBy = 'eventTimestamp',
  includeMetadata,
  continuation,
  type = [],
}: {
  users: string[]
  collection?: string[]
  limit?: number
  sortBy?: string
  includeMetadata?: T
  continuation?: string
  type?: ['sale', 'ask', 'transfer', 'mint', 'bid', 'bid_cancel', 'ask_cancel'] | []
}) {
  users = users.map(getAddress) ?? raise(`Invalid address: ${users}`)
  const queryParameters = urlSearchParams({
    limit,
    sortBy,
    includeMetadata: Boolean(includeMetadata),
    continuation,
  })
  const usersQueryParameter = users.map((user) => `users=${user}`).join('&')
  const collectionQueryParameter = collection?.map((collection) => `collection=${collection}`).join('&') ?? ''
  const typeQueryParameter = type?.map((type) => `type=${type}`).join('&') ?? ''
  const url = `${RESERVOIR_BASE_URL}/users/activity/v6?${queryParameters}&${usersQueryParameter}&${collectionQueryParameter}&${typeQueryParameter}`
  type Activity = T extends true ? NFTActivityWithMetadata : NFTActivity
  const response = await fetcher<
    | {
        continuation: string
        activities: Activity[]
      }
    | ReservoirErrorResponse
  >(url, { headers: AUTH_HEADER })
  if ('error' in response) {
    raise(`[Reservoir] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

// https://docs.reservoir.tools/reference/getusersusercollectionsv3

export async function fetchUserNFTCollections({
  user,
  includeTopBid = true,
  includeLiquidCount = true,
  offset,
  limit = 100,
}: {
  user: string
  includeTopBid?: boolean
  includeLiquidCount?: boolean
  offset?: number
  limit?: number
}) {
  const walletAddress = getAddress(user) ?? raise(`Invalid address: ${user}`)
  const queryParameters = urlSearchParams({
    includeTopBid,
    includeLiquidCount,
    offset,
    limit,
  })
  const url = `${RESERVOIR_BASE_URL}/users/${walletAddress}/collections/v3?${queryParameters}`

  const response = await fetcher<{ collections: Array<UserNFTCollection> } | ReservoirErrorResponse>(url, {
    headers: AUTH_HEADER,
  })
  if ('error' in response) {
    raise(`[Reservoir] error for url ${url}:\n${JSON.stringify(response, undefined, 2)}`)
  }
  return response
}

interface ReservoirErrorResponse {
  statusCode: number
  error: string
  message: string
}

export interface UserNFTCollection {
  collection: NFTCollection
  ownership: {
    tokenCount: string
    onSaleCount: string
    liquidCount: string
  }
}

export interface NFTCollection {
  id: string
  slug: string
  name: string
  image: string
  banner: string
  discordUrl: string
  externalUrl: string
  twitterUsername: string
  openseaVerificationStatus: string
  description: string
  sampleImages: Array<string>
  tokenCount: string
  tokenSetId: string
  primaryContract: string
  floorAskPrice: {
    currency: {
      contract: string
      name: string
      symbol: string
      decimals: number
    }
    amount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
    netAmount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
  }
  topBidValue: {
    currency: {
      contract: string
      name: string
      symbol: string
      decimals: number
    }
    amount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
    netAmount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
  }
  topBidMaker: string
  topBidSourceDomain: string
  rank: {
    '1day': number
    '7day': number
    '30day': number
    allTime: number
  }
  volume: {
    '1day': number
    '7day': number
    '30day': number
    allTime: number
  }
  volumeChange: {
    '1day': number
    '7day': number
    '30day': number
  }
  floorSale: {
    '1day': number
    '7day': number
    '30day': number
  }
  contractKind: string
}

export interface NFTActivity {
  type: 'sale' | 'ask' | 'transfer' | 'mint' | 'bid' | 'bid_cancel' | 'ask_cancel'
  fromAddress: Address
  toAddress?: Address
  amount: number
  timestamp: number
  createdAt: string
  contract: Address
  token: {
    tokenId: string
  }
  collection: {
    collectionId: Address
  }
  txHash?: Hex
  logIndex?: number
  batchIndex?: number
  price?: {
    currency: {
      contract: string
      name: string
      symbol: string
      decimals: number
    }
    amount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
  }
  order?: {
    id: Hex
  }
}
export interface NFTActivityWithMetadata extends NFTActivity {
  price?: {
    currency: {
      contract: string
      name: string
      symbol: string
      decimals: number
    }
    amount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
    netAmount: {
      raw: string
      decimal: number
      usd: number
      native: number
    }
  }
  token: {
    tokenId: string
    tokenName: string
    tokenImage: string
    lastBuy: {
      value: number
      timestamp: number
    }
    lastSell: {
      value: number
      timestamp: number
    }
    tokenRarityScore: number
    tokenRarityRank: number
    tokenMedia: string
  }
  collection: {
    collectionId: Address
    collectionName: string
    collectionImage: string
  }
  order?: {
    id: Hex
    side: string
    source: object
    criteria: {
      kind: string
      data: {
        token: {
          tokenId: string
          name: string
          image: string
        }
        collection: {
          id: Address
          name: string
          image: string
        }
      }
    }
  }
}

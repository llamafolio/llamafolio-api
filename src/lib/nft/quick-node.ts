import environment from '@environment'
import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'
import { getAddress, isHex } from 'viem'

const QUICKNODE_BASE_URL = 'https://api.quicknode.com/graphql'
const QUICKNODE_API_KEY = environment.QUICKNODE_API_KEY ?? raise('QUICKNODE_API_KEY is not set')
const AUTH_HEADER = { 'X-API-KEY': QUICKNODE_API_KEY }

export type QuickNodeChain = Extract<Chain, 'ethereum' | 'polygon'>

interface QuickNodeResponse<T> {
  data: {
    [chain in QuickNodeChain]: T | null
  }
  code?: number
  message?: string
  name?: string
}

/**
 * GraphQL Playgorund
 * https://studio.apollographql.com/public/QuickNode-Federation-API/variant/production/explorer
 */

export const TransactionFragment = /* graphql */ `
  fragment TransactionFragment on Transaction {
    blockNumber
    blockTimestamp
    contractAddress
    fromAddress
    toAddress
    type
    value
    gas
  }
`

export const TokenEventFragment = /* graphql */ `
  ${TransactionFragment}
  fragment TokenEventFragment on TokenEvent {
    type
    timestamp
    blockNumber
    fromAddress
    toAddress
    transferIndex
    transactionHash
    transaction { ...TransactionFragment }
  }
`

export const TokenEventsFragment = /* graphql */ `
  ${TokenEventFragment}
  fragment TokenEventsFragment on NFTTokenEventsConnection {
    totalCount
    edges {
      node { ...TokenEventFragment }
    }
    pageInfo { hasNextPage }
  }
`

export const CollectionFragment = /* graphql */ `
  ${TokenEventsFragment}
  fragment CollectionFragment on Collection {
    name
    address
    slug
    symbol
    attributes {
      totalCount
      edges {
        node {
          name
          value
        }
      }
    }
  }
`

export const NFTFragment = /* graphql */ `
  ${CollectionFragment}
  fragment NFTFragment on NFT {
    name
    contractAddress
    tokenId
    description
    externalUrl
    collection { ...CollectionFragment }
    tokenEvents { ...TokenEventsFragment }
  }
`
export const WalletNFTsFragment = /* graphql */ `
  ${NFTFragment}
  fragment WalletNFTsFragment on WalletNFTsConnection {
    totalCount
    edges {
      node {
        nft {
          ... on ERC1155NFT {
            ...NFTFragment
          }
          ... on ERC721NFT {
            ...NFTFragment
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
`

export async function fetchUserNFTsFromQuickNode({
  address,
  chain = 'ethereum',
  limit = 100,
  pageKey = null,
}: {
  address: string
  chain?: QuickNodeChain
  limit?: number
  pageKey: string | null
}) {
  const walletAddress = getAddress(address) ?? raise(`Invalid address ${address}`)

  const query = /* graphql */ `
    ${WalletNFTsFragment}
    query WalletNFTsQuery(
      $address: String!
      $orderBy: WalletNFTsOrderBy = DATE_ACQUIRED
      $first: Int = 100
      $after: String
    ) {
      ${chain} {
        walletByAddress(address: $address) {
          address
          ensName
          walletNFTs(orderBy: $orderBy, first: $first, after: $after) {
            ...WalletNFTsFragment
          }
        }
      }
    }`
  const response = await fetcher<QuickNodeResponse<QuickNodeUserNFTs>>(QUICKNODE_BASE_URL, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({
      query,
      variables: {
        operationName: 'WalletNFTsQuery',
        address: walletAddress,
        first: limit,
        after: pageKey,
      },
    }),
  })
  if (Object.hasOwn(response, 'error')) {
    raise(response)
  }
  return {
    nfts: response.data[chain]?.walletByAddress?.walletNFTs,
    pageKey: response.data[chain]?.walletByAddress?.walletNFTs?.pageInfo?.endCursor,
  }
}

export async function batchFetchMetadataFromQuickNode<
  T extends {
    contractAddress: string
    tokenId: string
    chain?: QuickNodeChain
  },
>(parameters: Array<T>) {
  parameters.map((item) => isHex(item.contractAddress) ?? raise(`Invalid address ${item.contractAddress}`))

  const query = /* graphql */ `
    query NFTMetadata {
      ${parameters.map(
        (item) => /* graphql */ `
          _${item.contractAddress.toLowerCase()}_${item.tokenId.toLowerCase()}: ${item.chain} {
            nft(tokenId: "${item.tokenId}", contractAddress: "${item.contractAddress}") {
              name
              metadata
              tokenId
              description
              externalUrl
              animationUrl
              contractAddress
              collectionSlug
              ... on ERC1155NFT {
                name
                metadata
                tokenId
                externalUrl
                description
                animationUrl
                collectionSlug
                contractAddress
              }
              ... on ERC721NFT {
                name
                metadata
                tokenId
                externalUrl
                description
                contractAddress
                collectionSlug
                attributes {
                  value
                  name
                }
              }
            }
          }`,
      )}
    }`

  const response = await fetcher<{
    data: {
      [key in `${T['contractAddress']}_${T['tokenId']}`]: {
        nft: QuickNodeNFT
      }
    }
  }>(QUICKNODE_BASE_URL, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({
      query,
    }),
  })
  if (Object.hasOwn(response, 'error')) {
    raise(response)
  }
  return response.data
}

export async function batchFetchNFTTradingHistoryFromQuickNode<
  T extends {
    contractAddress: string
    tokenId: string
    chain?: QuickNodeChain
  },
>(parameters: ReadonlyArray<T>) {
  parameters.map((item) => isHex(item.contractAddress) ?? raise(`Invalid address ${item.contractAddress}`))

  const query = /* graphql */ `
  query TokenEvents {
    ${parameters.map(
      (item) => /* graphql */ `
      _${item.contractAddress.toLowerCase()}_${item.tokenId.toLowerCase()}: ${item.chain ?? 'ethereum'} {
        nft(contractAddress: "${item.contractAddress}", tokenId: "${item.tokenId}") {
          QuickNodeTokenEvents {
            totalCount
            edges {
              node {
                type
                transactionHash
                fromAddress
                toAddress
                timestamp
                blockNumber
                transferIndex
                ... on TokenBurnEvent {
                  type
                  transferIndex
                  transactionHash
                  tokenQuantity
                  tokenId
                  toAddress
                  timestamp
                  fromAddress
                  contractERCStandard
                  contractAddress
                  blockNumber
                }
                ... on TokenMintEvent {
                  type
                  transferIndex
                  transactionHash
                  tokenQuantity
                  tokenId
                  toAddress
                  timestamp
                  fromAddress
                  contractERCStandard
                  contractAddress
                  blockNumber
                }
                ... on TokenSaleEvent {
                  type
                  transferIndex
                  transactionHash
                  toAddress
                  timestamp
                  sentTokenQuantity
                  sentTokenId
                  receivedTokenQuantity
                  receivedTokenId
                  receivedTokenContractAddress
                  marketplace
                  fromAddress
                  contractERCStandard
                  contractAddress
                  blockNumber
                }
              }
            }
          }
        }
      }`,
    )}
  }`

  const response = await fetcher<{
    data: Record<`_${T['contractAddress']}_${T['tokenId']}`, { nft: { QuickNodeTokenEvents: QuickNodeTokenEvents } }>
  }>(QUICKNODE_BASE_URL, {
    method: 'POST',
    headers: AUTH_HEADER,
    body: JSON.stringify({ query }),
  })

  if (Object.hasOwn(response, 'error')) {
    raise(response)
  }
  return response.data
}

interface QuickNodeUserNFTs {
  walletByAddress: {
    address: string
    ensName: string
    walletNFTs: {
      totalCount: number
      edges: Array<{
        node: {
          nft: {
            name?: string
            contractAddress: string
            tokenId: any
            description?: string
            externalUrl?: string
            collection: {
              name: string
              address: string
              slug: any
              symbol?: string
              attributes: {
                totalCount: any
                edges: Array<{
                  node: {
                    name: string
                    value: string
                  }
                }>
              }
            }
            tokenEvents: {
              totalCount: number
              edges: Array<{
                node: {
                  type: string
                  timestamp: string
                  blockNumber: number
                  fromAddress: string
                  toAddress: string
                  transferIndex: number
                  transactionHash: string
                  transaction: {
                    blockNumber: number
                    blockTimestamp: string
                    contractAddress: any
                    fromAddress: string
                    toAddress: string
                    type: string
                    value: any
                    gas: number
                  }
                }
              }>
              pageInfo: {
                hasNextPage: boolean
              }
            }
          }
        }
      }>
      pageInfo: {
        hasNextPage: boolean
        hasPreviousPage: boolean
        startCursor: string
        endCursor: string
      }
    }
  }
}

interface QuickNodeTokenEvents {
  totalCount: number
  edges: Array<{
    node: QuickNodeTokenEvent
  }>
}

export interface QuickNodeTokenEvent {
  type: string
  transactionHash: string
  fromAddress: string
  toAddress: string
  timestamp: string
  blockNumber: number
  transferIndex: number
  sentTokenQuantity?: number
  sentTokenId?: number
  receivedTokenQuantity?: string
  receivedTokenId: any
  receivedTokenContractAddress?: string
  marketplace?: string
  contractERCStandard?: string
  contractAddress?: string
  tokenQuantity?: number
  tokenId?: number
}

interface QuickNodeNFT {
  name: string | null
  tokenId: string
  metadata: {
    image: string
    attributes: Array<{
      value: string
      trait_type: string
    }>
  }
  description: any
  externalUrl: any
  animationUrl: any
  contractAddress: string
  collectionSlug: any
  attributes: Array<{
    value: string
    name: string
  }>
}

import { raise } from '@lib/error'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { WalletNFTs } from './types'

export const sequenceSupportedChains = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'avalanche',
  'gnosis',
  'bsc',
] as const

export async function fetchUserNFTsFromSequence({
  address,
  chain,
}: {
  address: Address
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'gnosis' | 'bsc'
}): Promise<WalletNFTs> {
  const _chain = chain === 'ethereum' ? 'mainnet' : chain
  const url = `https://${_chain}-indexer.sequence.app/rpc/Indexer/GetTokenBalances`
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      accountAddress: walletAddress,
      includeMetadata: true,
    }),
  })
  if (!response.ok) {
    raise(`${response.status} - Failed to fetch from Sequence: ${response.statusText}`)
  }
  const data = (await response.json()) as SequenceResponse & SequenceError
  if (Object.hasOwn(data, 'error')) {
    raise(`Sequence response: ${JSON.stringify(data, undefined, 2)}`)
  }
  return {
    address,
    nfts: data.balances.map((nft) => ({
      contractAddress: nft.contractAddress,
      tokenId: nft.tokenID,
      name: nft.tokenMetadata?.name || nft.contractInfo.name,
      description: nft.tokenMetadata?.description ?? '',
      imageURL: nft.tokenMetadata?.image || nft.contractInfo.logoURI || nft.contractInfo.extensions.ogImage,
      chain,
      contractType: nft.contractInfo.type,
      count: Number(nft.balance),
    })),
  }
}

interface SequenceError {
  status: number
  code: string
  msg: string
  error: string
}

interface SequenceResponse {
  page: {
    pageSize: number
    more: boolean
  }
  balances: Array<{
    contractType: string
    contractAddress: Address
    accountAddress: Address
    tokenID: string
    balance: string
    blockHash: string
    blockNumber: number
    chainId: number
    contractInfo: {
      chainId: number
      address: string
      name: string
      type: string
      symbol: string
      decimals?: number
      deployed: boolean
      bytecodeHash: string
      extensions: {
        link: string
        description: string
        ogImage: string
        originChainId: number
        originAddress: Address
      }
      logoURI?: string
    }
    tokenMetadata?: {
      tokenId: string
      contractAddress: Address
      name: string
      description: string
      image: string
      decimals: number
      properties: any
      external_url?: string
      attributes?: Array<{
        trait_type: string
        value: any
        display_type?: string
      }>
      animation_url?: string
    }
  }>
}

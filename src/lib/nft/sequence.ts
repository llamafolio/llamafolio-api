import type { Chain } from '@lib/chains'
import { raise } from '@lib/error'
import { fetcher } from '@lib/fetcher'
import type { Address } from 'viem'
import { getAddress } from 'viem'

const SEQUENCE_BASE_URL = (chain: Chain) => `https://${sequenceChains[chain]}-indexer.sequence.app/rpc/Indexer`

export const sequenceChains: {
  [chain: string]: string
} = {
  ethereum: 'mainnet',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  avalanche: 'avalanche',
  gnosis: 'gnosis',
  bsc: 'bsc',
}

// fetchUserNFTsFromSequence({ address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' }).then(console.log)

export async function fetchUserNFTsFromSequence({ address, chain = 'ethereum' }: { address: Address; chain?: Chain }) {
  const walletAddress = getAddress(address) ?? raise('Invalid address')
  const url = `${SEQUENCE_BASE_URL(chain)}/GetTokenBalances`
  const response = await fetcher<SequenceAccountNftsResponse | SequenceError>(url, {
    method: 'POST',
    body: JSON.stringify({
      accountAddress: walletAddress,
      includeMetadata: true,
    }),
  })
  if ('error' in response) {
    raise(`[sequence] error for url ${url}: ${response.error}`)
  }
  return response
}

interface SequenceError {
  status: number
  code: string
  msg: string
  error: string
}

interface SequenceAccountNftsResponse {
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

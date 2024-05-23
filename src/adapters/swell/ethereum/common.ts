import type { Contract } from '@lib/adapter'
import { type Chain, chainByChainId } from '@lib/chains'

type SwellTags = 'LST' | 'Pendle' | 'AVS' | 'Eigenpie' | 'LRT'

interface SwellApiToken {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logoUri: string
  tags: SwellTags[]
}

interface TokenListResponse {
  tokenList: {
    name: string
    timestamp: number
    tokens: SwellApiToken[]
  }
}

export async function getAcceptedTokens(): Promise<SwellApiToken[]> {
  try {
    const resp = await fetch(
      'https://v3-lst.svc.swellnetwork.io/swell.v3.PreDepositService/TokenList?connect=v1&encoding=json&message=%7B%7D',
    )
    const data: TokenListResponse = await resp.json()
    return data.tokenList.tokens
  } catch (e) {
    console.error('Failed to fetch token list from Swell:', e)
    return []
  }
}

export function fromSwellApiTokenToContract(tokens: SwellApiToken[]): Contract[] {
  return tokens.map((token) => ({
    chain: chainByChainId[token.chainId].id as Chain,
    address: token.address.toLowerCase() as `0x${string}`,
    decimals: token.decimals,
  }))
}

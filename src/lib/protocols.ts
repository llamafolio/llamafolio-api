import { chainById, chainIdResolver } from '@lib/chains'

export interface IProtocol {
  slug: string
  name: string
  description?: string
  twitter: string
  url: string
  logo: string
  category: string
  chain: string
  chains: string[]
  tvl: number
}

export async function fetchProtocols() {
  const protocols: IProtocol[] = []

  return protocols
}

export function getProtocolSlug(name: string) {
  return name?.toLowerCase().split(' ').join('-').split("'").join('') ?? ''
}

function getChainName(chains: string[]) {
  if (chains.length === 0) {
    return ''
  }

  if (chains.length > 1) {
    return 'Multi-Chain'
  }

  // use our naming if possible
  const chain = chainById[chainIdResolver[chains[0].toLowerCase()]]
  if (chain) {
    return chain.name
  }

  return chains[0]
}

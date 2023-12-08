// NFT metadata parser
// SEE: https://github.com/ourzora/nft-metadata

import type { BaseContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { abi as erc721Abi } from '@lib/erc721'
import { getIPFSUrl, isIPFS } from '@lib/ipfs'
import { createDataURI, fetchMimeType } from '@lib/media'
import { multicall } from '@lib/multicall'

async function fetchURI(url: string) {
  // TODO: arweave

  if (isIPFS(url)) {
    url = getIPFSUrl(url)
  }

  const response = await fetch(url)

  if (!response.ok) {
    console.log(`Failed to fetch URI ${url}, reason: [${response.status}] ${response.statusText}`)
    return null
  }

  return response.json()
}

function normaliseAttributes(attributes: Record<string, any> | Record<string, any>[]): NFTAttribute[] {
  if (Array.isArray(attributes)) {
    return attributes.map((attribute) => ({
      traitType: attribute.trait_type,
      value: attribute.value,
    }))
  }

  if (typeof attributes === 'object') {
    return Object.keys(attributes).map((traitType: string) => ({
      value: attributes[traitType],
      traitType,
    }))
  }

  return attributes
}

function normaliseURIData(data: Record<string, any>) {
  let normalisedData = data

  // If properties exist on object, copy them over to attributes.
  // Properties match the 1155 standard for metadata properties.
  if (normalisedData.properties) {
    normalisedData = {
      ...normalisedData,
      attributes: normalisedData.properties,
    }
  }

  const attributes = normalisedData.attributes || normalisedData.traits
  const image = normalisedData.image || normalisedData.image_url
  return {
    ...normalisedData,
    ...(image && {
      image,
    }),
    ...(attributes && {
      attributes: normaliseAttributes(attributes),
    }),
  }
}

interface NFTContract {
  chain: Chain
  address: `0x${string}`
  id: string
}

export interface NFTAttribute {
  traitType: string
  value: string
}

export interface NFTMetadata {
  tokenURI?: string
  tokenURL?: string
  tokenURLMimeType?: string
  name?: string
  description?: string
  imageURL?: string
  imageURLMimeType?: string
  contentURL?: string
  contentURLMimeType?: string
  attributes?: NFTAttribute[]
}

export async function decodeNFTMetadata(ctx: BaseContext, contracts: NFTContract[]) {
  const tokenURIsRes = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address, params: [BigInt(contract.id)] }) as const),
    abi: erc721Abi.tokenURI,
  })

  await Promise.all(
    contracts.map(async (contract, idx) => {
      try {
        const tokenURIRes = tokenURIsRes[idx]
        const tokenURI = tokenURIRes.success ? tokenURIRes.output : undefined
        if (!tokenURI) {
          // @ts-ignore
          contract.metadata = {}
          return contract
        }

        const uriData = await fetchURI(tokenURI)

        const meta = normaliseURIData({
          ...uriData,
          ...(uriData?.mimeType && {
            contentURLMimeType: uriData.mimeType,
          }),
        })

        if (meta.image) {
          meta.imageURL = getIPFSUrl(meta.image)
        }

        if (meta.image_data) {
          meta.imageURL = createDataURI('application/svg+xml', meta.image_data)
          meta.imageURLMimeType = 'application/svg+xml'
        }

        if (meta.animation_url) {
          meta.contentURL = getIPFSUrl(meta.animation_url)
        }

        if (!meta.contentURL && meta.imageURL) {
          meta.contentURL = meta.imageURL
        }

        if (meta.contentURL && !meta.contentURLMimeType) {
          meta.contentURLMimeType = await fetchMimeType(meta.contentURL)
        }

        if (meta.imageURL && !meta.imageURLMimeType) {
          meta.imageURLMimeType = await fetchMimeType(meta.imageURL)
        }

        const metadata = {
          tokenURI,
          tokenURL: getIPFSUrl(tokenURI),
          tokenURLMimeType: 'application/json',
          name: meta.name,
          description: meta.description,
          attributes: meta.attributes,
          externalURL: meta.external_url,
          imageURL: meta.imageURL,
          imageURLMimeType: meta.imageURLMimeType,
          contentURL: meta.contentURL,
          contentURLMimeType: meta.contentURLMimeType,
        }

        // @ts-ignore
        contract.metadata = metadata
        return contract
      } catch (error) {
        console.log(`Failed to decode NFT metadata: ${error}`)
        return contract
      }
    }),
  )

  return contracts
}

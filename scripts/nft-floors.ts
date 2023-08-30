#!/usr/bin/env tsx
import { urlSearchParams } from '@lib/fetcher'

main()
  .then((_) => console.log(JSON.stringify(_, undefined, 2)))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

async function main() {
  const collections = await topCollections()
  if (!collections) return
  const prices = await Promise.all(
    collections.map(async (collection: any) => {
      const { tokens } = await tokenPrices(collection.contractAddress)
      return {
        ...collection,
        topBids: tokens,
      }
    }),
  )
  return prices
}

// https://element.readme.io/reference/get-collection-ranking-list
async function topCollections() {
  const ELEMENT_API_KEY = process.env.ELEMENT_API_KEY
  if (!ELEMENT_API_KEY) throw new Error('Missing ELEMENT_API_KEY')
  const searchParams = urlSearchParams({
    chain: 'eth',
    sort_type: 'Top',
    level: 'L5M',
    limit: 100, // max 100
  })
  try {
    const response = await fetch(`https://api.element.market/openapi/v1/collection/ranking?${searchParams}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': ELEMENT_API_KEY,
      },
    })
    if (!response.ok) {
      throw new Error(`[topCollections()] HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    return result.data.rankingList.map((item: any) => ({
      name: item.collectionRank.collection.name,
      slug: item.collectionRank.collection.slug,
      contractAddress: item.collectionRank.collection.contracts[0].address,
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Encoutered an error: error`
    console.error(errorMessage)
    return null
  }
}

// https://docs.reservoir.tools/reference/gettokensfloorv1
async function tokenPrices(contractAddress: string) {
  const RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY
  if (!RESERVOIR_API_KEY) throw new Error('Missing RESERVOIR_API_KEY')
  const searchParams = urlSearchParams({
    collection: contractAddress,
  })
  try {
    const response = await fetch(`https://api.reservoir.tools/tokens/floor/v1?${searchParams}`, {
      headers: {
        Accept: '*/*',
        'X-Api-Key': RESERVOIR_API_KEY,
      },
    })
    if (!response.ok) {
      throw new Error(`[tokenPrices()] HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    return result as { tokens: Record<string, number> }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Encoutered an error: error`
    console.error(errorMessage)
    throw error
  }
}

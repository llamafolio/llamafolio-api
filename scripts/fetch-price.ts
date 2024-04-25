/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { chains } from '@lib/chains'
import { fetchCoingeckoCoins } from '@lib/coingecko'
import tokens from 'scripts/tokens/tokenListsByMarketCap.json'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const platformMapping: { [key: string]: string } = {
  'binance-smart-chain': 'bsc',
  'arbitrum-one': 'arbitrum',
  zksync: 'zksync-era',
  xdai: 'gnosis',
  'polygon-pos': 'polygon',
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

async function _getFetchCGCoinsListsWithPrice() {
  const allTokens = []
  let backOffTime = 15000
  const longDelay = 45000
  const maxRetries = 3
  let retryCount = 0

  await delay(60000)

  const coingecko_api = 'https://api.coingecko.com/api/v3/coins/markets'
  const coingecko_params = 'vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false&locale=en'

  for (let page = 0; page < 40; page++) {
    await delay(page % 2 === 0 ? backOffTime : longDelay)
    const response = await fetch(`${coingecko_api}?${coingecko_params}&page=${page}`)
    if (!response.ok) {
      console.log(`Failed to fetch page ${page}: ${response.statusText}, retrying with longer delay...`)
      backOffTime *= 2
      if (backOffTime > longDelay) {
        backOffTime = longDelay
      }
      if (++retryCount > maxRetries) {
        console.log(`Max retries hit for page ${page}, skipping to next page...`)
        page++
        retryCount = 0
      } else {
        page--
      }
      continue
    }

    const data = await response.json()
    if (data.length === 0) {
      console.log(`No data in page ${page}, retrying...`)
      page--
      continue
    }

    allTokens.push(...data)
    backOffTime = 15000
    retryCount = 0
  }

  const jsonDatas = JSON.stringify(allTokens, null, 2)
  const dirPath = path.join(__dirname, 'tokens')
  const src = path.join(dirPath, 'tokenListsByMarketCap.json')

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  fs.writeFileSync(src, jsonDatas, 'utf8')
  console.log('File has been saved to:', src)
}

async function main() {
  const cgCoins = await fetchCoingeckoCoins()

  for (const cgCoin of cgCoins) {
    const matchingToken = (tokens as any[]).find((token) => token.id === cgCoin.id)
    if (matchingToken) {
      const mergedObject = { ...matchingToken, ...cgCoin }
      const platforms = mergedObject.platforms || {}
      Object.entries(platforms).forEach(([platform, address]) => {
        const mappedPlatform = platformMapping[platform] || platform
        if (chains.find((chain) => chain.id === mappedPlatform && chain.indexed)) {
          const platformDir = path.join(__dirname, 'tokens', mappedPlatform)
          if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true })
          }

          const cleanObject = { ...mergedObject, platforms: { [mappedPlatform]: address } }
          const dataString = JSON.stringify(cleanObject, null, 2)
          const filePath = path.join(platformDir, `${address}.json`)
          fs.writeFileSync(filePath, dataString, 'utf8')
          console.log(`Data for ${cleanObject.id} stored in ${filePath}`)
        }
      })
    }
  }
}

main().catch(console.error)

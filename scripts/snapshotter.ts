import path from 'node:path'
import url from 'node:url'

import type { ClickHouseClient } from '@clickhouse/client'
import { client } from '@db/clickhouse'
import { selectInteractingTokenHolders } from '@db/interactingHolder'
import type { Adapter } from '@lib/adapter'
import { chainByChainId, getChainId } from '@lib/chains'
import { toYYYYMMDD, unixFromDateTime } from '@lib/fmt'

interface ContractFlows {
  holders: string[]
  inflow: string[]
  outflow: string[]
}

interface DailyBlock {
  date: string
  timestamp: number
  block_number: number
  contracts: { [contractAddress: string]: string[] }
}

interface DailyBlockFlow {
  date: string
  timestamp: number
  block_number: number
  contracts: { [contractAddress: string]: ContractFlows }
}

type DailyBlockFlows = DailyBlockFlow[]
type EnrichedBlocks = DailyBlock[]

const second = 1000
const minute = second * 60
const hour = minute * 60
const day = hour * 24
const week = day * 7
const month = day * 30

const period: { [key in 'd' | 'w' | 'm']: string } = {
  d: toYYYYMMDD(new Date(Date.now() - day)),
  w: toYYYYMMDD(new Date(Date.now() - week)),
  m: toYYYYMMDD(new Date(Date.now() - month)),
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run update-adapter-balances {adapter} {chain}')
}

/**
 * Get range of daily last block number / timestamp
 * @param client
 * @param adapterId
 * @param chainId
 * @param fromDate
 */

async function getJobBlocksRange(client: ClickHouseClient, chainId: number, elapsedPeriod: 'd' | 'w' | 'm') {
  const fromDate = period[elapsedPeriod]

  const query = `
    SELECT
      toDate(timestamp) AS day,
      max(timestamp) AS max_timestamp,
      argMax(number, timestamp) AS block_number
    FROM evm_indexer2.blocks
    WHERE
      chain = ${chainId} AND
      toDate(timestamp) >= '${fromDate}' AND
      toDate(timestamp) < toDate(now())
    GROUP BY day
    ORDER BY day ASC
  `

  const queryRes = await client.query({ query })

  const res = (await queryRes.json()) as {
    data: { day: string; max_timestamp: string; block_number: string }[]
  }

  return res.data.map((row) => ({
    date: row.day,
    timestamp: unixFromDateTime(row.max_timestamp),
    block_number: parseInt(row.block_number, 10),
  }))
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-adapter-balances.ts
  // argv[2]: adapter
  // argv[3]: chain

  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const adapterId = process.argv[2]
  const chainId = getChainId(process.argv[3])
  const chainInfo = chainByChainId[chainId]
  if (chainInfo == null) {
    return console.error(`Missing chain ${process.argv[3]}`)
  }

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
  const adapter = module.default as Adapter

  const chainAdapter = adapter[chainInfo.id]
  if (!chainAdapter) {
    return console.error(
      `Chain ${chainInfo.id} not supported for adapter ${adapterId}. \nMaybe you forgot to add this chain to src/adapters/${adapterId}/index.ts ?`,
    )
  }

  const dailyBlocks = await getJobBlocksRange(client, chainId, 'w')
  const enrichedBlocks: DailyBlock[] = []

  for (let i = 0; i < dailyBlocks.length; i++) {
    const dailyBlock = dailyBlocks[i]
    const startTimestamp = i === 0 ? dailyBlock.timestamp - 86400 : dailyBlocks[i - 1].timestamp
    const endTimestamp = dailyBlock.timestamp

    const interactingHolders = await selectInteractingTokenHolders(
      client,
      chainId,
      adapterId,
      startTimestamp,
      endTimestamp,
    )

    enrichedBlocks.push({
      ...dailyBlock,
      contracts: Object.fromEntries(
        Object.entries(interactingHolders).map(([contractAddress, tokenHolder]) => [
          contractAddress,
          tokenHolder.holders,
        ]),
      ),
    })
  }

  const enrichedBlocksWithFlows: DailyBlockFlows = processDailyInflowOutflow(enrichedBlocks)

  console.log(enrichedBlocksWithFlows[0])
}

function processDailyInflowOutflow(enrichedBlocks: EnrichedBlocks): DailyBlockFlows {
  const results: DailyBlockFlows = []

  for (let i = 1; i < enrichedBlocks.length; i++) {
    const currentBlock = enrichedBlocks[i]
    const previousBlock = enrichedBlocks[i - 1]
    const analysisResult: DailyBlockFlow = {
      date: currentBlock.date,
      timestamp: currentBlock.timestamp,
      block_number: currentBlock.block_number,
      contracts: {},
    }

    const contractAddresses = new Set([...Object.keys(currentBlock.contracts), ...Object.keys(previousBlock.contracts)])

    contractAddresses.forEach((contractAddress) => {
      const currentHolders = currentBlock.contracts[contractAddress] || []
      const previousHolders = previousBlock.contracts[contractAddress] || []

      const inflow = currentHolders.filter((holder) => !previousHolders.includes(holder))
      const outflow = previousHolders.filter((holder) => !currentHolders.includes(holder))

      analysisResult.contracts[contractAddress] = {
        holders: currentHolders,
        inflow,
        outflow,
      }
    })

    results.push(analysisResult)
  }

  return results
}

main()

import type { ClickHouseClient } from '@clickhouse/client'
import { shortAddress, unixFromDateTime } from '@lib/fmt'
import { readFileSync } from 'fs'
import path from 'path'
import { decodeEventLog, getEventSelector, parseAbi } from 'viem'

export async function selectLatestDexes(
  client: ClickHouseClient,
  chainId: number,
  limit: number,
  offset: number,
  window: 'd' | 'w' | 'm',
) {
  const hours: { [key in 'd' | 'w' | 'm']: number } = {
    d: 24,
    w: 24 * 7,
    m: 24 * 30,
  }

  const interval = hours[window] || 24
  const signatures = getShortSelector()
  const signaturesList = signatures.map((sig) => `'${sig}'`).join(', ')

  const queryRes = await client.query({
    query: `
    WITH "latest_dexes" AS (
      SELECT
          "timestamp",
          "transaction_hash",
          "log_index",
          ("topic0", "topic1", "topic2", "topic3") AS "topics",
          "data",
          "signature"
      FROM
          evm_indexer2.logs
      WHERE
          "chain" = {chainId: UInt64} AND
          "timestamp" >= now() - interval {interval: UInt16} hour AND
          "signature" IN (${signaturesList})
  ),
  (
          SELECT count() FROM "latest_dexes"
  ) AS "count"
  
      SELECT 
        *,
        "count"
    FROM "latest_dexes"
    ORDER BY "timestamp" DESC
    LIMIT
      25
    `,
    query_params: {
      chainId,
      limit,
      offset,
      interval,
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      timestamp: string
      transaction_hash: string
      log_index: string
      topics: `0x${string}`[]
      data: `0x${string}`
      count: string
      updated_at: string
      signature: string
    }[]
  }

  return res.data.map((row) => ({
    transactionHash: row.transaction_hash,
    logIndex: parseInt(row.log_index),
    signature: row.signature,
    data: decodeDexes(row.signature, row.data, row.topics),
    count: parseInt(row.count),
    timestamp: unixFromDateTime(row.timestamp),
    updatedAt: unixFromDateTime(row.updated_at),
  }))
}

function decodeDexes(signature: string, data: `0x${string}`, topics: any) {
  const signatureEvent = getAbiByShortSelector(signature)
  return {
    data: decodeEventLog({
      abi: parseAbi([`event ${signatureEvent.eventSignature}`] as any),
      data,
      topics,
    }),
  }
}

function getShortSelector(): string[] {
  const abiPath = path.join(process.cwd(), 'scripts', 'abis', 'dexes.json')

  try {
    const abiContent = readFileSync(abiPath, 'utf8')
    const abis = JSON.parse(abiContent)

    return abis.map((abi: any) => Object.keys(abi)[0])
  } catch (e) {
    console.error('Failed to retrieve shortSelector', e)
    throw e
  }
}

function getAbiByShortSelector(shortSelectorToMatch: string) {
  const abiPath = path.join(process.cwd(), 'scripts', 'abis', 'dexes.json')

  try {
    const abiContent = readFileSync(abiPath, 'utf8')
    const abis = JSON.parse(abiContent)

    for (const functionOrEvent of abis) {
      const signature = Object.keys(functionOrEvent)[0]
      if (signature === shortSelectorToMatch) {
        const selector = getEventSelector(functionOrEvent[signature])
        const short_selector = shortAddress(selector)
        const eventSignature = generateEventSignature(functionOrEvent[signature])
        const abi = functionOrEvent[signature]

        return { short_selector, selector, eventSignature, abi }
      }
    }

    return abis
  } catch (e) {
    console.error('Failed to retrieve abi', e)
    throw e
  }
}

function generateEventSignature(abi: any) {
  const { name, inputs } = abi
  const inputTypesAndNames = inputs
    .map((input: any) => {
      const indexedPart = input.indexed ? ' indexed' : ''
      return `${input.type}${indexedPart} ${input.name}`
    })
    .join(', ')

  return `${name}(${inputTypesAndNames})`
}

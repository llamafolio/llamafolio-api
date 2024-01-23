/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import type { ClickHouseClient } from '@clickhouse/client'
import { formatBalance } from '@db/balances'
import { client } from '@db/clickhouse'
import environment from '@environment'
import type { Adapter, Balance, BalancesConfig, BaseContract } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { fmtBalanceBreakdown, resolveHealthFactor, sanitizeBalances, sanitizePricedBalances } from '@lib/balance'
import { chainByChainId, getChainId } from '@lib/chains'
import { toYYYYMMDD, unixFromYYYYMMDD, unixToDateTime, unixToYYYYMMDD } from '@lib/fmt'
import { mulPrice, sum } from '@lib/math'
import { getHistoricalTokenPrices } from '@lib/price'
import type { Token } from '@lib/token'

import {
  getBalancesJobStatus,
  getBalancesSnapshot,
  getBalancesSnapshotStatus,
  type JobStatus,
} from './utils/adapter-balances-job'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run update-adapter-balances {adapter} {chain}')
}

interface BalancesPricesSnapshotStatus {
  // YYYY-MM-DD
  prevDate: string
  // YYYY-MM-DD
  date: string
  missingTokenPrices: string[]
}

interface BalancesPricesSnapshot {
  balances: BalancesConfig
}

async function getPriceJobStatus(adapterId: string, chainId: number) {
  try {
    const chain = chainByChainId[chainId]?.id
    const src = path.join(__dirname, '..', 'internal', 'balances_snapshots_prices', adapterId, chain, 'status.json')
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as JobStatus
  } catch (error) {
    return null
  }
}

function savePriceJobStatus(adapterId: string, chainId: number, data: JobStatus) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots_prices', adapterId, chain, 'status.json')
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

async function saveBalancesPricesSnapshot(
  adapterId: string,
  chainId: number,
  date: string,
  address: string,
  data: BalancesPricesSnapshot,
) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(
    __dirname,
    '..',
    'internal',
    'balances_snapshots_prices',
    adapterId,
    chain,
    date,
    `${address}.json`,
  )
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

async function saveBalancesPricesSnapshotStatus(
  adapterId: string,
  chainId: number,
  date: string,
  data: BalancesPricesSnapshotStatus,
) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots_prices', adapterId, chain, date, `status.json`)
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Get range of days between adapter prices job and adapter balances job
 * @param fromDate
 * @param toDate
 */
function getDays(fromDate: string, toDate: string) {
  const days: string[] = []

  let timestamp = unixFromYYYYMMDD(fromDate)
  let day = unixToYYYYMMDD(timestamp)

  while (day !== toDate) {
    days.push(day)
    timestamp += 86400
    day = unixToYYYYMMDD(timestamp)
  }

  return days
}

async function getTokenPrices(
  client: ClickHouseClient,
  usersBalances: { [key: string]: BalancesConfig },
  chainId: number,
  date: string,
) {
  const tokensPrices: { [key: string]: number | null } = {}
  const tokensContract: { [key: string]: BaseContract } = {}

  for (const user in usersBalances) {
    const balancesConfig = usersBalances[user]
    for (const group of balancesConfig.groups) {
      for (const balance of group.balances) {
        if (balance.token) {
          tokensPrices[balance.token.toLowerCase()] = null
          tokensContract[balance.token.toLowerCase()] = balance
        }

        if (balance.address) {
          tokensPrices[balance.address.toLowerCase()] = null
          tokensContract[balance.address.toLowerCase()] = balance
        }

        if (balance.rewards) {
          for (const reward of balance.rewards) {
            tokensPrices[reward.address.toLowerCase()] = null
            tokensContract[reward.address.toLowerCase()] = reward
          }
        }

        if (balance.underlyings) {
          for (const underlying of balance.underlyings) {
            tokensPrices[underlying.address.toLowerCase()] = null
            tokensContract[underlying.address.toLowerCase()] = underlying
          }
        }
      }
    }
  }

  const tokens = Object.keys(tokensPrices)
  console.log(`Get ${tokens.length} prices`)

  // Snapshots are taken "end of day", so use token prices at opening the next day
  const nextDateTimestamp = unixFromYYYYMMDD(date) + 86400
  // Try from DB
  const queryRes = await client.query({
    query: `
      SELECT
        "address",
        "price_usd"
      FROM evm_indexer2.daily_prices
      WHERE
        "chain" = {chainId: UInt64} AND
        toStartOfDay("timestamp") = toStartOfDay({day: DateTime}) AND
        "address" IN {tokens: Array(String)};
    `,
    query_params: {
      chainId,
      day: unixToDateTime(nextDateTimestamp),
      tokens,
    },
  })

  const res = (await queryRes.json()) as {
    data: { address: string; price_usd: string }[]
  }

  console.log(`Found ${res.data.length} tokens prices in DB`)

  for (const row of res.data) {
    tokensPrices[row.address] = parseFloat(row.price_usd)
  }

  // collect missing prices, fetch their prices and store them
  const missingTokensPrices: Token[] = []
  const newTokensPrices: Token[] = []
  // not found in DB or on DefiLlama
  const notFoundTokensPrices: string[] = []

  for (const token in tokensContract) {
    const contract = tokensContract[token]
    if (!tokensPrices[token]) {
      missingTokensPrices.push({
        chain: chainByChainId[chainId].id,
        address: token as `0x${string}`,
        decimals: contract.decimals,
        symbol: contract.symbol,
        name: contract.name,
      } as Token)
    }
  }

  // too many tokens fail, break down into multiple calls
  const batchPrices = await Promise.all(
    sliceIntoChunks(missingTokensPrices, 150).map((tokens) => getHistoricalTokenPrices(tokens, nextDateTimestamp)),
  )

  for (const batchPrice of batchPrices) {
    for (const token of batchPrice) {
      if (token.price != null) {
        tokensPrices[token.address] = token.price
        newTokensPrices.push(token)
      }
    }
  }

  for (const missingTokenPrice of missingTokensPrices) {
    let found = false
    for (const newTokenPrice of newTokensPrices) {
      if (missingTokenPrice.address.toLowerCase() === newTokenPrice.address.toLowerCase()) {
        found = true
        break
      }
    }
    if (!found) {
      notFoundTokensPrices.push(missingTokenPrice.address.toLowerCase())
    }
  }
  if (notFoundTokensPrices.length > 0) {
    console.log(`Not found ${notFoundTokensPrices.length} tokens prices`)
  }

  // store new tokens prices
  if (newTokensPrices.length > 0) {
    console.log(`Inserting ${newTokensPrices.length} new tokens prices`)

    await client.insert({
      table: 'evm_indexer2.daily_prices',
      values: newTokensPrices.map((token) => {
        return {
          chain: chainId,
          address: token.address.toLowerCase(),
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
          timestamp: unixToDateTime(nextDateTimestamp),
          // @ts-ignore
          price_usd: token.price || 0,
        }
      }),
      format: 'JSONEachRow',
    })
  }

  return { tokensPrices, missing: notFoundTokensPrices }
}

function addBalancesPrice(balances: Balance[], tokensPrices: { [key: string]: number | null }) {
  for (const balance of balances) {
    if (balance.rewards) {
      for (const reward of balance.rewards) {
        const price = tokensPrices[reward.address.toLowerCase()]
        if (price != null) {
          const decimals = Number(reward.decimals)
          reward.balanceUSD = mulPrice(reward.amount || 0n, decimals, price)
          reward.claimableUSD = reward.claimable ? mulPrice(reward.claimable || 0n, decimals, price) : undefined
        }
      }
    }

    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        const price = tokensPrices[underlying.address.toLowerCase()]
        if (price != null) {
          const decimals = Number(underlying.decimals)
          underlying.balanceUSD = mulPrice(underlying.amount || 0n, decimals, price)
        }
      }

      // use underlyings values
      balance.balanceUSD = sum(balance.underlyings.map((b) => b.balanceUSD || 0))
      continue
    }

    const price = tokensPrices[balance.token?.toLowerCase() || balance.address.toLowerCase()]
    const decimals = balance.decimals

    if (price && decimals) {
      balance.balanceUSD = mulPrice(balance.amount || 0n, Number(decimals), price)
    }
  }

  return balances
}

async function saveDBBalancesSnapshots(
  client: ClickHouseClient,
  chainId: number,
  adapterId: string,
  date: string,
  version: number,
  balances: any[],
) {
  if (version > 0) {
    // fetch previous daily balances
    const queryRes = await client.query({
      query: `
    SELECT * FROM ${environment.NS_LF}.adapters_balances_snapshots
    WHERE
      "chain" = {chainId: UInt64} AND
      "adapterId" = {adapterId: String} AND
      toStartOfDay("timestamp") = toStartOfDay({timestamp: DateTime}) AND
      "version" = {version: UInt32};
    `,
      query_params: {
        chain: chainId,
        adapterId,
        timestamp: unixToDateTime(unixFromYYYYMMDD(date)),
        version: version - 1,
      },
    })

    const res = (await queryRes.json()) as {
      data: any[]
    }

    // delete previous
    for (const balance of res.data) {
      balances.push({ ...balance, sign: -1 })
    }
  }

  if (balances.length > 0) {
    console.log(`Storing ${balances.length} balances in DB`)
    await client.insert({
      table: `${environment.NS_LF}.adapters_balances_snapshots`,
      values: balances,
      format: 'JSONEachRow',
    })
  }
}

/**
 * Enhance raw balances snapshots with token prices
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-adapter-balances-prices.ts
  // argv[2]: adapter
  // argv[3]: chain
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const now = new Date()
  const startTime = Date.now()
  // end of day today. "today" snapshot will be processed tomorrow
  const today = toYYYYMMDD(now)

  const adapterId = process.argv[2]
  const chainId = getChainId(process.argv[3])
  const chainInfo = chainByChainId[chainId]
  if (chainInfo == null) {
    return console.error(`Missing chain ${process.argv[3]}`)
  }

  const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId, 'index.ts'))
  const adapter = module.default as Adapter

  const chainAdapter = adapter[chainInfo.id]
  if (!chainAdapter) {
    return console.error(
      `Chain ${chainInfo.id} not supported for adapter ${adapterId}. \nMaybe you forgot to add this chain to src/adapters/${adapterId}/index.ts ?`,
    )
  }

  const balancesJobStatus = await getBalancesJobStatus(adapterId, chainId)
  if (balancesJobStatus == null) {
    return console.error(`Missing balances status`)
  }

  let priceJobStatus = await getPriceJobStatus(adapterId, chainId)
  if (priceJobStatus == null) {
    if (!chainAdapter.config.startDate) {
      return console.error(`Protocol "startDate" missing in adapter config`)
    }

    priceJobStatus = {
      prevDate: unixToYYYYMMDD(chainAdapter.config.startDate - 86400),
      date: unixToYYYYMMDD(chainAdapter.config.startDate),
      version: 0,
    }
  }

  if (priceJobStatus.date === today) {
    return console.log('Done')
  }

  // Daily tasks left inclusive [priceJobStatus.date, balancesJobStatus.date[
  const days = getDays(priceJobStatus.date, balancesJobStatus.date)

  // For each day:
  // - get all balances
  // - extract unique tokens
  // - fetch tokens prices and store them
  // - compute priced balances and store them
  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    // Snapshots are taken at "end of day" (last block minted yesterday)
    if (day === today) {
      return console.log('Done')
    }

    const balancesSnapshotStatus = await getBalancesSnapshotStatus(adapterId, chainId, day)
    if (balancesSnapshotStatus == null) {
      return console.error(`Missing balances at ${day}`)
    }

    console.log(`Date: ${day}`)
    const outputDir = path.join(__dirname, '..', 'internal', 'balances_snapshots_prices', adapter.id, chainInfo.id, day)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const usersBalances: { [key: string]: BalancesConfig } = {}

    console.log(`Active users: ${balancesSnapshotStatus.activeUsers.length}`)
    // Get daily balances snapshots
    for (const user of balancesSnapshotStatus.activeUsers) {
      const balancesSnapshot = await getBalancesSnapshot(adapterId, chainId, day, user)
      if (balancesSnapshot) {
        usersBalances[user] = balancesSnapshot?.balancesConfig
      }
    }

    const { missing, tokensPrices } = await getTokenPrices(client, usersBalances, chainId, priceJobStatus.date)

    const dbBalances: any[] = []

    for (const user in usersBalances) {
      const groups = usersBalances[user].groups.map((group, groupIdx) => {
        const sanitizedBalances = sanitizeBalances(group.balances)
        // attach prices
        const pricedBalances = addBalancesPrice(sanitizedBalances, tokensPrices)
        const sanitizedPricedBalances = sanitizePricedBalances(pricedBalances)
        const balancesWithBreakdown = sanitizedPricedBalances.map(fmtBalanceBreakdown)
        const formattedBalances = balancesWithBreakdown.map(formatBalance)
        const healthFactor = group.healthFactor || resolveHealthFactor(formattedBalances)

        for (let idx = 0; idx < formattedBalances.length; idx++) {
          const balance = formattedBalances[idx]
          dbBalances.push({
            ...balance,
            chain: chainId,
            holder: user.toLowerCase(),
            adapterId,
            timestamp: unixToDateTime(unixFromYYYYMMDD(day)),
            healthFactor,
            groupIdx,
            idx,
            version: priceJobStatus?.version || 0,
            sign: 1,
          })
        }

        return {
          ...group,
          healthFactor,
          balances: formattedBalances,
        }
      })

      saveBalancesPricesSnapshot(adapterId, chainId, day, user, {
        balances: { groups },
      })
    }

    await saveDBBalancesSnapshots(client, chainId, adapterId, day, priceJobStatus.version || 0, dbBalances)

    await saveBalancesPricesSnapshotStatus(adapterId, chainId, day, {
      missingTokenPrices: missing,
      date: day,
      prevDate: priceJobStatus.prevDate,
    })

    priceJobStatus.prevDate = priceJobStatus.date
    priceJobStatus.date = i < days.length - 1 ? days[i + 1] : today

    await savePriceJobStatus(adapterId, chainId, priceJobStatus)

    const endTime = Date.now()
    console.log(`Completed in ${endTime - startTime}ms`)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

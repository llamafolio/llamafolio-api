/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import type { ClickHouseClient } from '@clickhouse/client'
import { client } from '@db/clickhouse'
import { getDailyContractsInteractions, groupContracts } from '@db/contracts'
import {
  type Adapter,
  type Balance,
  type BalancesConfig,
  type BalancesContext,
  type Contract,
  revalidateAllContracts,
} from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { InMemoryCache } from '@lib/cache'
import { chainByChainId, getChainId } from '@lib/chains'
import { toYYYYMMDD, unixFromDateTime, unixToYYYYMMDD } from '@lib/fmt'

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

/**
 * NOTE: Snapshots are recorded at end of day (includes transactions of the day)
 */
export interface BalancesSnapshotStatus {
  // YYYY-MM-DD
  prevDate: string
  // YYYY-MM-DD
  date: string
  // Cumulative e.g if a user deposited at day d0, he is still considered active at d1 and later
  // (until he fully exits his position)
  activeUsers: string[]
  // New users who were not active before and entered a non-empty position
  usersInflows: string[]
  // Users who were active before and fully exited their position
  usersOutflows: string[]
  errors: string[]
}

export interface BalancesSnapshot {
  contracts: Contract[]
  balancesConfig: BalancesConfig
}

function saveBalancesJobStatus(adapterId: string, chainId: number, data: JobStatus) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapterId, chain, 'status.json')
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

async function saveBalancesSnapshotStatus(
  adapterId: string,
  chainId: number,
  date: string,
  data: BalancesSnapshotStatus,
) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapterId, chain, date, 'status.json')
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

async function saveBalancesSnapshot(
  adapterId: string,
  chainId: number,
  date: string,
  address: string,
  data: BalancesSnapshot,
) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapterId, chain, date, `${address}.json`)
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Get range of daily last block number / timestamp
 * @param client
 * @param adapterId
 * @param chainId
 * @param fromDate
 */
async function getJobBlocksRange(client: ClickHouseClient, adapterId: string, chainId: number, fromDate: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        toDate("timestamp") AS "day",
        max("timestamp") AS "max_timestamp",
        argMax("number", "timestamp") AS "block_number"
      FROM evm_indexer2.blocks
      WHERE
        "chain" = {chainId: UInt64} AND
        "day" >= toDate({fromDate: String}) AND
        "day" < toDate(now())
      GROUP BY "day"
      ORDER BY "day" ASC
    `,
    query_params: {
      adapterId,
      chainId,
      fromDate,
    },
  })

  const res = (await queryRes.json()) as {
    data: { day: string; max_timestamp: string; block_number: string }[]
  }

  return res.data.map((row) => ({
    date: row.day,
    timestamp: unixFromDateTime(row.max_timestamp),
    block_number: parseInt(row.block_number),
  }))
}

function hasNonEmptyBalance(balancesConfig: BalancesConfig) {
  for (const group of balancesConfig.groups) {
    for (const balance of group.balances) {
      if ((balance as Balance).amount > 0n) {
        return true
      }

      // underlyings
      if (balance.underlyings && balance.underlyings.length > 0) {
        for (const underlying of balance.underlyings) {
          if ((underlying as Balance).amount > 0n) {
            return true
          }
        }
      }

      // rewards
      if (balance.rewards && balance.rewards.length > 0) {
        for (const reward of balance.rewards) {
          if ((reward as Balance).amount > 0n) {
            return true
          }
        }
      }
    }
  }

  return false
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

  const startTime = Date.now()
  // end of day today. "today" snapshot will be processed tomorrow
  const today = toYYYYMMDD(new Date())

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

  let jobStatus = await getBalancesJobStatus(adapterId, chainId)
  if (jobStatus == null) {
    if (!chainAdapter.config.startDate) {
      return console.error(`Protocol "startDate" missing in adapter config`)
    }

    jobStatus = {
      prevDate: unixToYYYYMMDD(chainAdapter.config.startDate - 86400),
      date: unixToYYYYMMDD(chainAdapter.config.startDate),
      version: 0,
    }
  }

  if (jobStatus.date === today) {
    return console.log('Done')
  }

  // Update contracts
  // NOTE: contracts are time independent (deployed anytime) but it's ok as
  // past contracts interactions only occur for deployed contracts
  await revalidateAllContracts(client, adapter, chainInfo.id)

  // Daily tasks left inclusive [jobStatus.date, today[
  const dailyBlocks = await getJobBlocksRange(client, adapterId, chainId, jobStatus.date)

  for (let i = 0; i < dailyBlocks.length; i++) {
    const dailyBlock = dailyBlocks[i]
    // Snapshots are taken at "end of day" (last block minted yesterday)
    if (dailyBlock.date === today) {
      return console.log('Done')
    }

    const cache = new InMemoryCache<string, any>()

    const previousSnapshot = await getBalancesSnapshotStatus(adapterId, chainId, jobStatus.prevDate)

    console.log(`Date: ${dailyBlock.date}`)
    const outputDir = path.join(
      __dirname,
      '..',
      'internal',
      'balances_snapshots',
      adapter.id,
      chainInfo.id,
      dailyBlock.date,
    )
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // "active users" (users to revalidate) are users who previously used the protocol
    // + users who interacted with the protocol during that day
    const previousActiveUsers = new Set(previousSnapshot?.activeUsers || [])
    const usersInflows = new Set<string>()
    const usersOutflows = new Set<string>()

    console.log(`Prev active users: ${previousActiveUsers.size}`)

    const dailyContractsInteractions = await getDailyContractsInteractions(client, adapterId, chainId, jobStatus.date)

    const activeUsers = new Set(previousActiveUsers)
    for (const user in dailyContractsInteractions) {
      activeUsers.add(user)
    }

    const users = Array.from(activeUsers)
    console.log(`Updating users: ${users.length}`)

    const usersChunks = sliceIntoChunks(users, 500)

    const errors = new Set<string>()

    for (const users of usersChunks) {
      await Promise.all(
        users.map(async (user) => {
          const previousBalancesSnapshot = await getBalancesSnapshot(adapterId, chainId, jobStatus!.prevDate, user)

          const allContractsInteractions = previousBalancesSnapshot?.contracts || []
          const contractsInteractions = dailyContractsInteractions[user] || []

          // "merge" new daily contracts interactions with past contracts interactions
          for (const contract of contractsInteractions) {
            // prevent duplicate contracts
            let has_contract = false
            for (const prevContract of allContractsInteractions) {
              if (
                prevContract.__key === contract.__key &&
                prevContract.address === contract.address &&
                prevContract.token === contract.token
              ) {
                has_contract = true
                break
              }
            }

            if (!has_contract) {
              allContractsInteractions.push(contract)
            }
          }

          try {
            const ctx: BalancesContext = {
              cache,
              address: user as `0x${string}`,
              chain: chainInfo.id,
              adapterId,
              blockNumber: dailyBlock.block_number,
            }

            const balancesConfig = await chainAdapter.getBalances(ctx, groupContracts(allContractsInteractions) || [])

            // User fully exited his position, skip future updates (until a new interaction)
            const isActive = hasNonEmptyBalance(balancesConfig)
            if (!isActive) {
              activeUsers.delete(user)

              if (previousActiveUsers.has(user)) {
                usersOutflows.add(user)
              }
            } else {
              // Store balances snapshot
              await saveBalancesSnapshot(adapterId, chainId, jobStatus!.date, user, {
                contracts: allContractsInteractions,
                balancesConfig,
              })

              // New user entered a position
              if (!previousActiveUsers.has(user)) {
                usersInflows.add(user)
              }
            }
          } catch (error) {
            errors.add(user)
          }
        }),
      )
    }

    // TODO: errors retries
    // TODO: should probably throw earlier on errors, and just fix them as it'll mess up with the rest of the process
    if (errors.size > 0) {
      console.error(`Errors: ${errors.size}`)
    }

    console.log(`Active users: ${activeUsers.size}`)
    console.log(`Users inflows: ${usersInflows.size}`)
    console.log(`Users outflows: ${usersOutflows.size}`)

    await saveBalancesSnapshotStatus(adapterId, chainId, dailyBlock.date, {
      activeUsers: Array.from(activeUsers),
      usersInflows: Array.from(usersInflows),
      usersOutflows: Array.from(usersOutflows),
      date: dailyBlock.date,
      errors: Array.from(errors),
      prevDate: jobStatus.prevDate,
    })

    jobStatus.prevDate = jobStatus.date
    jobStatus.date = i < dailyBlocks.length - 1 ? dailyBlocks[i + 1].date : today

    await saveBalancesJobStatus(adapterId, chainId, jobStatus)

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

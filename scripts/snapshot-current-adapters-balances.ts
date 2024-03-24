/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { adapters } from '@adapters'
import type { ClickHouseClient } from '@clickhouse/client'
import { formatBalance } from '@db/balances'
import { client } from '@db/clickhouse'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import environment from '@environment'
import type { Adapter, AdapterHandler, Balance, BalancesContext, Contract, PricedBalance } from '@lib/adapter'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { fmtBalanceBreakdown, resolveHealthFactor, sanitizeBalances, sanitizePricedBalances } from '@lib/balance'
import { chainById, chains, getRPCClient, type IChainInfo } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { toYYYYMMDD, unixFromYYYYMMDD, unixToDateTime } from '@lib/fmt'
import logger from '@lib/logger'
import { getPricedBalances } from '@lib/price'
import { timeout } from '@lib/promise'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

type AdapterBalance = Balance & {
  groupIdx: number
  adapterId: string
  timestamp: Date
  healthFactor: number
  fromAddress: string
}

type AdapterJobStatus = 'success' | 'error' | 'pending'

interface JobStatus {
  // YYYY-MM-DD
  date: string
  status: AdapterJobStatus
  error?: string
}

function saveSnapshotJobStatus(adapterId: string, chain: string, date: string, data: JobStatus) {
  const src = path.join(
    __dirname,
    '..',
    'internal',
    'current_balances_snapshots',
    adapterId,
    chain,
    date,
    'status.json',
  )
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

function saveSnapshotJobContracts(
  adapterId: string,
  chain: string,
  date: string,
  data: { [address: string]: Contract[] },
) {
  const src = path.join(
    __dirname,
    '..',
    'internal',
    'current_balances_snapshots',
    adapterId,
    chain,
    date,
    'contracts.json',
  )
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

function rmSnapshotJobContracts(adapterId: string, chain: string, date: string) {
  try {
    const src = path.join(
      __dirname,
      '..',
      'internal',
      'current_balances_snapshots',
      adapterId,
      chain,
      date,
      'contracts.json',
    )
    return fs.unlinkSync(src)
  } catch (error) {
    return null
  }
}

function getSnapshotJobContracts(adapterId: string, chain: string, date: string) {
  try {
    const src = path.join(
      __dirname,
      '..',
      'internal',
      'current_balances_snapshots',
      adapterId,
      chain,
      date,
      'contracts.json',
    )
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as { [address: string]: Contract[] }
  } catch (error) {
    return null
  }
}

function getSnapshotJobStatus(adapterId: string, chain: string, date: string) {
  try {
    const src = path.join(
      __dirname,
      '..',
      'internal',
      'current_balances_snapshots',
      adapterId,
      chain,
      date,
      'status.json',
    )
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as JobStatus
  } catch (error) {
    return null
  }
}

async function saveDBBalancesSnapshots(
  client: ClickHouseClient,
  chainId: number,
  adapterId: string,
  date: string,
  version: number,
  balances: any[],
) {
  if (balances.length > 0) {
    const _logger = logger.child({ chain: chainId, adapterId })
    _logger.info(`Storing ${balances.length} balances in DB`)

    await client.insert({
      table: `${environment.NS_LF}.adapters_balances_snapshots`,
      values: balances,
      format: 'JSONEachRow',
    })
  }
}

async function processAdapter({
  adapter,
  chainAdapter,
  chain,
  today,
  now,
  allContractsInteractions,
}: {
  adapter: Adapter
  chainAdapter: AdapterHandler
  chain: IChainInfo
  today: string
  now: Date
  allContractsInteractions: { [address: string]: Contract[] } | null
}) {
  const startTime = Date.now()

  const _logger = logger.child({ chain: chain.chainId, adapterId: adapter.id })
  _logger.info(`Start ${adapter.id} on ${chain.id}`)

  const rpcClient = getRPCClient({
    chain: chain.id,
    httpTransportConfig: { batch: { batchSize: 1000, wait: 10 } },
    batchConfig: {
      multicall: {
        batchSize: 1000,
        wait: 10,
      },
    },
  })

  const cache = new Map<string, any>()

  // Get contracts interactions
  if (!allContractsInteractions) {
    // Update contracts
    // await revalidateAllContracts(client, adapter, chain.id)

    // Wait for async insert to be processed
    // await sleep(5_000)

    _logger.info(`Date: ${today}`)

    allContractsInteractions = await getAllContractsInteractions(client, adapter.id, chain.chainId)

    saveSnapshotJobContracts(adapter.id, chain.id, today, allContractsInteractions)
  }

  const users: string[] = []
  for (const user in allContractsInteractions) {
    users.push(user)
  }

  _logger.info(`Updating users: ${users.length}`)

  const usersChunks = sliceIntoChunks(users, 100)

  let chunkChunkIdx = 0

  // Process users by chunks
  // Dump data every few chunk to still move forward in case of failure
  const usersChunksChunks = sliceIntoChunks(usersChunks, 10)

  for (const _usersChunks of usersChunksChunks) {
    const balances: AdapterBalance[] = []

    await Promise.all(
      _usersChunks.map(async (users, chunkIdx) => {
        _logger.info(`Batch ${chunkChunkIdx * 10 + chunkIdx} / ${usersChunks.length}`)

        // Get users balances
        return Promise.all(
          users.map((user) => {
            // skip address zero
            if (user === ADDRESS_ZERO) {
              return
            }

            const runAdapter = async () => {
              const ctx: BalancesContext = {
                chain: chain.id,
                address: user,
                adapterId: adapter.id,
                failThrough: true,
                client: rpcClient,
                cache,
              }

              const contractsInteractions = allContractsInteractions![user] || []

              const balancesConfig = await chainAdapter.getBalances(ctx, groupContracts(contractsInteractions) || [])

              for (let groupIdx = 0; groupIdx < balancesConfig.groups.length; groupIdx++) {
                const group = balancesConfig.groups[groupIdx]
                for (const balance of group.balances) {
                  // use token when available
                  balance.address = (balance.token || balance.address).toLowerCase()
                  // metadata
                  balance.groupIdx = groupIdx
                  balance.adapterId = adapter.id
                  balance.timestamp = now
                  balance.healthFactor = group.healthFactor
                  balance.fromAddress = user
                  balance.chain = chain.id

                  balances.push(balance)
                }
              }
            }

            // 2 min timeout / users chunk
            return timeout(runAdapter(), 120 * 1000)
          }),
        )
      }),
    )

    chunkChunkIdx++

    _logger.info(`Chunk balances: ${balances.length}`)

    const sanitizedBalances = sanitizeBalances(balances)

    // TODO: cache prices across chunks
    const pricedBalances = await getPricedBalances(sanitizedBalances)

    const sanitizedPricedBalances = sanitizePricedBalances(pricedBalances as PricedBalance[])

    const dbBalances: any[] = []

    // Group back
    const balancesByUser = groupBy(sanitizedPricedBalances, 'fromAddress')

    for (const user in balancesByUser) {
      const balancesByGroupIdx = groupBy(balancesByUser[user], 'groupIdx')

      for (const groupIdx in balancesByGroupIdx) {
        const balancesWithBreakdown = balancesByGroupIdx[groupIdx].map(fmtBalanceBreakdown)
        const formattedBalances = balancesWithBreakdown.map(formatBalance)
        const healthFactor = balancesByGroupIdx[groupIdx]?.[0]?.healthFactor || resolveHealthFactor(formattedBalances)

        for (let idx = 0; idx < formattedBalances.length; idx++) {
          const balance = formattedBalances[idx]
          dbBalances.push({
            ...balance,
            chain: chain.chainId,
            holder: user.toLowerCase(),
            adapterId: adapter.id,
            timestamp: unixToDateTime(unixFromYYYYMMDD(today)),
            healthFactor,
            groupIdx,
            idx,
            version: chainAdapter.config?.version || 0,
            sign: 1,
          })
        }
      }
    }

    await saveDBBalancesSnapshots(
      client,
      chain.chainId,
      adapter.id,
      today,
      chainAdapter.config?.version || 0,
      dbBalances,
    )

    // remove processed users
    for (const users of _usersChunks) {
      for (const user of users) {
        delete allContractsInteractions![user]
      }
    }

    saveSnapshotJobContracts(adapter.id, chain.id, today, allContractsInteractions)
  }

  const endTime = Date.now()
  _logger.info(`Completed in ${endTime - startTime}ms`)
}

async function main() {
  const today = toYYYYMMDD(new Date())

  const now = new Date()

  for (const adapter of adapters) {
    if (adapter.id === 'wallet') {
      continue
    }

    for (const chain of chains) {
      const chainAdapter = adapter[chain.id]
      if (!chainAdapter) {
        continue
      }

      // base dir
      const outputDir = path.join(
        __dirname,
        '..',
        'internal',
        'current_balances_snapshots',
        adapter.id,
        chain.id,
        today,
      )
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      let snapshotJobStatus = getSnapshotJobStatus(adapter.id, chain.id, today)
      if (!snapshotJobStatus) {
        snapshotJobStatus = {
          date: today,
          status: 'pending',
        }
      }

      try {
        // Eventually restart job where it stopped
        const allContractsInteractions = getSnapshotJobContracts(adapter.id, chain.id, today)

        // Done
        if (snapshotJobStatus && snapshotJobStatus.status !== 'pending') {
          continue
        }

        await processAdapter({
          adapter,
          chainAdapter,
          chain: chainById[chain.id],
          today,
          now,
          allContractsInteractions,
        })

        snapshotJobStatus.status = 'success'
      } catch (error) {
        snapshotJobStatus.status = 'error'
        snapshotJobStatus.error = (error as any).message
      }

      rmSnapshotJobContracts(adapter.id, chain.id, today)

      // snapshot taken for adapter-chain
      saveSnapshotJobStatus(adapter.id, chain.id, today, snapshotJobStatus)
    }
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    logger.error(e)
    process.exit(1)
  })

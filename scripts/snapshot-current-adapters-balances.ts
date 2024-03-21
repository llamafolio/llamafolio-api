/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { adapterById, adapters } from '@adapters'
import { formatBalance, insertDailyBalances } from '@db/balances'
import { client } from '@db/clickhouse'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import {
  type Adapter,
  type AdapterHandler,
  type Balance,
  type BalancesContext,
  type Contract,
  type PricedBalance,
  revalidateAllContracts,
} from '@lib/adapter'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { fmtBalanceBreakdown, resolveHealthFactor, sanitizeBalances, sanitizePricedBalances } from '@lib/balance'
import { type Chain, chainById, chains, getRPCClient, type IChainInfo } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { toYYYYMMDD } from '@lib/fmt'
import { getPricedBalances } from '@lib/price'
import { sleep, timeout } from '@lib/promise'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

type AdapterBalance = Balance & {
  groupIdx: number
  adapterId: string
  timestamp: Date
  healthFactor: number
  fromAddress: string
}

type AdapterJobStatus = 'success' | 'error' | 'pending'

interface AdapterJob {
  id: string
  chain: Chain
  status: AdapterJobStatus
  error?: string
}

interface JobStatus {
  // YYYY-MM-DD
  date: string
  adapters: AdapterJob[]
}

function saveSnapshotJobStatus(data: JobStatus) {
  const src = path.join(__dirname, '..', 'internal', 'current_balances_snapshots', 'status.json')
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

export function getSnapshotJobStatus() {
  try {
    const src = path.join(__dirname, '..', 'internal', 'current_balances_snapshots', 'status.json')
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as JobStatus
  } catch (error) {
    return null
  }
}

async function processAdapter({
  adapter,
  chainAdapter,
  chain,
  today,
  now,
}: {
  adapter: Adapter
  chainAdapter: AdapterHandler
  chain: IChainInfo
  today: string
  now: Date
}) {
  const startTime = Date.now()

  console.log(`Start ${adapter.id} on ${chain.id}`)

  const rpcClient = getRPCClient({
    chain: chain.id,
    httpTransportConfig: { batch: { batchSize: 2000, wait: 10 } },
    batchConfig: {
      multicall: {
        batchSize: 2000,
        wait: 10,
      },
    },
  })

  const cache = new Map<string, any>()

  // Update contracts
  await revalidateAllContracts(client, adapter, chain.id)

  // Wait for async insert to be processed
  await sleep(5_000)

  console.log(`Date: ${today}`)
  const outputDir = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapter.id, chain.id, today)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const allContractsInteractions = await getAllContractsInteractions(client, adapter.id, chain.chainId)

  const users: string[] = []
  for (const user in allContractsInteractions) {
    users.push(user)
  }

  console.log(`Updating users: ${users.length}`)

  const balances: AdapterBalance[] = []
  const usersChunks = sliceIntoChunks(users, 250)

  const runAdapter = async (address: `0x${string}`, contracts: Contract[]) => {
    const ctx: BalancesContext = {
      chain: chain.id,
      address,
      adapterId: adapter.id,
      failThrough: true,
      client: rpcClient,
      cache,
    }

    const balancesConfig = await chainAdapter.getBalances(ctx, groupContracts(contracts) || [])

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
        balance.fromAddress = address
        balance.chain = chain.id

        balances.push(balance)
      }
    }
  }

  for (let i = 0; i < usersChunks.length; i++) {
    const users = usersChunks[i]

    console.log(`Batch ${i} / ${usersChunks.length}`)

    await Promise.all(
      users.map((user) => {
        // skip address zero
        if (user === ADDRESS_ZERO) {
          return
        }

        const contractsInteractions = allContractsInteractions[user] || []

        // 1 min timeout / users chunk
        return timeout(runAdapter(user as `0x${string}`, contractsInteractions), 60 * 1000)
      }),
    )
  }

  console.log(`Active users: ${balances.length}`)

  const sanitizedBalances = sanitizeBalances(balances)

  const pricedBalances = await getPricedBalances(sanitizedBalances)

  const sanitizedPricedBalances = sanitizePricedBalances(pricedBalances as PricedBalance[])

  const dbBalances: any[] = []

  // Group back
  const balancesByUser = groupBy(sanitizedPricedBalances, 'fromAddress')

  for (const user in balancesByUser) {
    const userBalances = balancesByUser[user].map(fmtBalanceBreakdown)
    const balancesByGroupIdx = groupBy(userBalances, 'groupIdx')

    for (const groupIdx in balancesByGroupIdx) {
      const groupBalances = balancesByGroupIdx[groupIdx].map(formatBalance)
      const healthFactor = balancesByGroupIdx[groupIdx]?.[0]?.healthFactor || resolveHealthFactor(groupBalances)

      for (const balance of balancesByGroupIdx[groupIdx]) {
        dbBalances.push({ ...balance, healthFactor })
      }
    }
  }

  await insertDailyBalances(client, dbBalances)

  const endTime = Date.now()
  console.log(`Completed in ${endTime - startTime}ms`)
}

async function main() {
  const today = toYYYYMMDD(new Date())

  const now = new Date()

  const adapterJobs: AdapterJob[] = []

  for (const adapter of adapters) {
    for (const chain of chains) {
      if (adapter[chain.id]) {
        adapterJobs.push({
          chain: chain.id,
          id: adapter.id,
          status: 'pending',
        })
      }
    }
  }

  // Start where left if process fails
  const snapshotJobStatus = getSnapshotJobStatus()
  // Merge status
  if (snapshotJobStatus != null) {
    for (let i = 0; i < snapshotJobStatus.adapters.length; i++) {
      adapterJobs[i].status = snapshotJobStatus.adapters[i].status
    }
  }

  for (let i = 0; i < adapterJobs.length; i++) {
    const adapterJob = adapterJobs[i]
    const adapter = adapterById[adapterJob.id]
    const chainAdapter = adapter?.[adapterJob.chain]
    if (adapter && chainAdapter) {
      try {
        await processAdapter({ adapter, chainAdapter, chain: chainById[adapterJob.chain], today, now })

        adapterJob.status = 'success'
      } catch (error) {
        adapterJob.status = 'error'
        adapterJob.error = (error as any).message
      }

      saveSnapshotJobStatus({
        date: today,
        adapters: adapterJobs,
      })
    }
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

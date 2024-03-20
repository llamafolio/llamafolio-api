/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { adapterById } from '@adapters'
import { client } from '@db/clickhouse'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import {
  type Adapter,
  type AdapterHandler,
  type Balance,
  type BalancesConfig,
  type BalancesContext,
  revalidateAllContracts,
} from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { chainByChainId, chainById, getRPCClient, type IChainInfo } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import { toPrevDay, toYYYYMMDD } from '@lib/fmt'

import { getBalancesSnapshots } from './utils/adapter-balances-job'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('npx tsx scripts/snapshot-adapters-balances.ts')
}

async function saveBalancesSnapshots(adapterId: string, chainId: number, date: string, data: BalancesConfig[]) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapterId, chain, date, 'balances.json')
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
}

async function saveBalancesSnapshotsChunk(
  adapterId: string,
  chainId: number,
  date: string,
  chunkIdx: number,
  data: BalancesConfig[],
) {
  const chain = chainByChainId[chainId]?.id
  const src = path.join(
    __dirname,
    '..',
    'internal',
    'balances_snapshots',
    adapterId,
    chain,
    date,
    `balances_chunk_${chunkIdx}.json`,
  )
  return fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8')
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

async function processAdapter({
  adapter,
  chainAdapter,
  chain,
  today,
  yesterday,
}: {
  adapter: Adapter
  chainAdapter: AdapterHandler
  chain: IChainInfo
  today: string
  yesterday: string
}) {
  const startTime = Date.now()

  console.log(`Start ${adapter.id} on ${chain.id}`)

  const ctx: BalancesContext = {
    chain: chain.id,
    adapterId: adapter.id,
    failThrough: true,
    client: getRPCClient({
      chain: chain.id,
      httpTransportConfig: { batch: { batchSize: 1000, wait: 10 } },
      batchConfig: {
        multicall: {
          batchSize: 1000,
          wait: 10,
        },
      },
    }),
  }

  try {
    // Update contracts
    // NOTE: contracts are time independent (deployed anytime) but it's ok as
    // past contracts interactions only occur for deployed contracts
    await revalidateAllContracts(client, adapter, chain.id)

    // Wait for async insert to be processed
    // await sleep(5_000)

    ctx.cache = new Map<string, any>()

    const currentSnapshot = await getBalancesSnapshots(adapter.id, chain.chainId, today)
    if (currentSnapshot != null) {
      console.log('Done')
      return
    }

    console.log(`Date: ${today}`)
    const outputDir = path.join(__dirname, '..', 'internal', 'balances_snapshots', adapter.id, chain.id, today)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const allContractsInteractions = await getAllContractsInteractions(client, adapter.id, chain.chainId)

    const users = new Set<string>()
    for (const user in allContractsInteractions) {
      users.add(user)
    }

    console.log(`Updating users: ${users.size}`)

    const usersChunks = sliceIntoChunks(Array.from(users), 100)

    for (let i = 0; i < usersChunks.length; i++) {
      const users = usersChunks[i]
      const balances: BalancesConfig[] = []

      console.log(`Batch ${i} / ${usersChunks.length}`)

      await Promise.all(
        users.map(async (user) => {
          // skip address zero
          if (user === ADDRESS_ZERO) {
            return
          }

          ctx.address = user

          const contractsInteractions = allContractsInteractions[user] || []

          const balancesConfig = await chainAdapter.getBalances(ctx, groupContracts(contractsInteractions) || [])

          const isActive = hasNonEmptyBalance(balancesConfig)

          if (isActive) {
            balancesConfig.fromAddress = user
            balances.push(balancesConfig)
          }
        }),
      )

      console.log(`Active users: ${balances.length}`)

      saveBalancesSnapshotsChunk(adapter.id, chain.chainId, today, i, balances)
    }

    const endTime = Date.now()
    console.log(`Completed in ${endTime - startTime}ms`)
  } catch (error) {
    console.error('ERROR')
    console.log(error)
    return
  }
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: snapshot-current-adapters-balances.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const yesterday = toYYYYMMDD(toPrevDay(new Date()))
  const today = toYYYYMMDD(new Date())

  await processAdapter({
    adapter: adapterById['aave-v2'],
    chainAdapter: adapterById['aave-v2']['ethereum'],
    chain: chainById['ethereum'],
    today,
    yesterday,
  })

  // for await (const adapter of adapters) {
  //   for (const chain of chains) {
  //     const chainAdapter = adapter[chain.id]
  //     if (!chainAdapter) {
  //       continue
  //     }

  //     await processAdapter({ adapter, chainAdapter, chain, today, yesterday })
  //   }
  // }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

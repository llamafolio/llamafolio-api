import { adapterById } from '../src/adapters'
import { insertBalances } from '../src/db/balances'
import { BalancesSnapshot, insertBalancesSnapshots } from '../src/db/balances-snapshots'
import { getAllContractsInteractionsTokenTransfers, getAllTokensInteractions } from '../src/db/contracts'
import { groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { BaseContext, Contract } from '../src/lib/adapter'
import { sanitizeBalances } from '../src/lib/balance'
import { chains } from '../src/lib/chains'
import { getPricedBalances } from '../src/lib/price'
import { isNotNullish } from '../src/lib/type'

function help() {
  console.log('npm run update-balances {address}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: update-balances.ts
  // argv[2]: address
  if (process.argv.length < 3) {
    console.error('Missing address argument')
    return help()
  }
  const address = process.argv[2].toLowerCase()

  const ctx: BaseContext = { address }

  const client = await pool.connect()

  try {
    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [contracts, tokens] = await Promise.all([
      getAllContractsInteractionsTokenTransfers(client, ctx.address),
      getAllTokensInteractions(client, ctx.address),
    ])

    const contractsByAdapterId: { [key: string]: Contract[] } = {}
    for (const contract of contracts) {
      if (!contract.adapterId) {
        console.error(`Missing adapterId in contract`, contract)
        continue
      }
      if (!contractsByAdapterId[contract.adapterId]) {
        contractsByAdapterId[contract.adapterId] = []
      }
      contractsByAdapterId[contract.adapterId].push(contract)
    }
    contractsByAdapterId['wallet'] = tokens

    console.log('Interacted with protocols:', Object.keys(contractsByAdapterId))

    const adaptersBalances = await Promise.all(
      Object.keys(contractsByAdapterId).flatMap((adapterId) => {
        const adapter = adapterById[adapterId]
        if (!adapter) {
          console.error(`Could not find adapter with id`, adapterId)
          return []
        }

        return chains.map(async (chain) => {
          const handler = adapter[chain.id]
          if (!handler) {
            return []
          }

          try {
            const hrstart = process.hrtime()

            const contracts =
              groupContracts(contractsByAdapterId[adapterId].filter((contract) => contract.chain === chain.id)) || []

            const balancesConfig = await handler.getBalances(ctx, contracts)

            const hrend = process.hrtime(hrstart)

            console.log(
              `[${adapterId}] getBalances ${contractsByAdapterId[adapterId].length} contracts, found ${balancesConfig.balances.length} balances in %ds %dms`,
              hrend[0],
              hrend[1] / 1000000,
            )

            // Tag balances with adapterId
            for (const balance of balancesConfig.balances) {
              balance.adapterId = adapterId
            }

            return balancesConfig
          } catch (error) {
            console.error(`[${adapterId}]: Failed to getBalances`, error)
            return []
          }
        })
      }),
    )

    // Ungroup balances to make only 1 call to the price API
    const balances = adaptersBalances.flatMap((balanceConfig) => balanceConfig?.balances).filter(isNotNullish)

    const sanitizedBalances = sanitizeBalances(balances)

    const hrstart = process.hrtime()

    const pricedBalances = await getPricedBalances(sanitizedBalances)

    const hrend = process.hrtime(hrstart)

    console.log(
      `getPricedBalances ${sanitizedBalances.length} balances, found ${pricedBalances.length} balances in %ds %dms`,
      hrend[0],
      hrend[1] / 1000000,
    )

    // group balances back by adapter
    const pricedBalancesByAdapterId: { [key: string]: any[] } = {}
    for (const pricedBalance of pricedBalances) {
      if (!pricedBalancesByAdapterId[pricedBalance.adapterId]) {
        pricedBalancesByAdapterId[pricedBalance.adapterId] = []
      }
      pricedBalancesByAdapterId[pricedBalance.adapterId].push(pricedBalance)
    }

    const now = new Date()

    const balancesSnapshots = Object.keys(contractsByAdapterId)
      .map((adapterId, i) => {
        const balanceConfig = adaptersBalances[i]
        const pricedBalances = pricedBalancesByAdapterId[adapterId]
        if (!balanceConfig || !pricedBalances) {
          return null
        }

        const balanceSnapshot: BalancesSnapshot = {
          fromAddress: address,
          adapterId,
          balanceUSD: sumBalances(pricedBalances.filter(isNotNullish)),
          timestamp: now,
          metadata: balanceConfig.metadata,
        }

        return balanceSnapshot
      })
      .filter(isNotNullish)

    await client.query('BEGIN')

    // Insert balances snapshots
    await insertBalancesSnapshots(client, balancesSnapshots)

    // Insert new balances
    // TODO: insert all at once
    await Promise.all(
      Object.keys(pricedBalancesByAdapterId).map((adapterId) =>
        insertBalances(client, pricedBalancesByAdapterId[adapterId], adapterId, address, now),
      ),
    )

    await client.query('COMMIT')
  } catch (e) {
    console.log('Failed to update balances', e)
    await client.query('ROLLBACK')
  } finally {
    client.release(true)
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

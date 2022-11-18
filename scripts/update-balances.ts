import format from 'pg-format'

import { adapterById } from '../src/adapters'
import { insertBalances } from '../src/db/balances'
import { getAllContractsInteractionsTokenTransfers, getAllTokensInteractions } from '../src/db/contracts'
import { groupContracts } from '../src/db/contracts'
import pool from '../src/db/pool'
import { BaseContext, Contract } from '../src/lib/adapter'
import { sanitizeBalances } from '../src/lib/balance'
import { strToBuf } from '../src/lib/buf'
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
      Object.keys(contractsByAdapterId)
        .map(async (adapterId) => {
          try {
            const adapter = adapterById[adapterId]
            if (!adapter) {
              console.error(`Could not find adapter with id`, adapterId)
              return null
            }

            const hrstart = process.hrtime()

            const contracts = groupContracts(contractsByAdapterId[adapterId]) || []
            const balancesConfig = await adapter.getBalances(ctx, contracts)

            const hrend = process.hrtime(hrstart)

            console.log(
              `[${adapterId}] getBalances ${contractsByAdapterId[adapterId].length} contracts, found ${balancesConfig.balances.length} balances in %ds %dms`,
              hrend[0],
              hrend[1] / 1000000,
            )

            // tag balances with adapterId
            for (const balance of balancesConfig.balances) {
              balance.adapterId = adapterId
            }

            return balancesConfig.balances
          } catch (error) {
            console.error(`[${adapterId}]: Failed to getBalances`, error)
            return null
          }
        })
        .filter(isNotNullish),
    )

    // Ungroup balances to make only 1 call to the price API
    const balances = adaptersBalances.flat().filter(isNotNullish)

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

    await client.query('BEGIN')

    // Delete old balances
    await client.query(format('delete from balances where from_address = %L::bytea', [strToBuf(address)]), [])

    // Insert new balances
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

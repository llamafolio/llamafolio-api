import { adapterById } from '@adapters/index'
import { insertBalances } from '@db/balances'
import { BalancesSnapshot, insertBalancesSnapshots } from '@db/balances-snapshots'
import { groupContracts } from '@db/contracts'
import { getAllContractsInteractions, getAllTokensInteractions } from '@db/contracts'
import pool from '@db/pool'
import { apiGatewayManagementApi } from '@handlers/apiGateway'
import type { AdapterBalancesResponse } from '@handlers/getBalances'
import { badRequest, serverError, success } from '@handlers/response'
import { BaseContext, Contract } from '@lib/adapter'
import { sanitizeBalances } from '@lib/balance'
import { isHex, strToBuf } from '@lib/buf'
import { chains } from '@lib/chains'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'

export const websocketUpdateAdaptersHandler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false // !important to reuse pool

  const { connectionId, address } = event as APIGatewayProxyEvent & { connectionId?: string; address?: string }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  if (!connectionId) {
    return badRequest('Missing connectionId parameter')
  }

  const ctx: BaseContext = { address }

  console.log('Update balances of address', ctx.address)

  const client = await pool.connect()

  try {
    // Early return if balances last update was < 1 minute ago
    const balancesRes = await client.query(
      // TODO: check balances_snapshots
      `select timestamp from balances where from_address = $1::bytea order by timestamp desc limit 1;`,
      [strToBuf(address)],
    )

    if (balancesRes.rows.length === 1) {
      const lastUpdatedAt = new Date(balancesRes.rows[0].timestamp).getTime()
      const now = new Date().getTime()
      // 1 minute delay
      if (now - lastUpdatedAt < 1 * 60 * 1000) {
        console.log('Update adapters balances cache', {
          now,
          lastUpdatedAt,
          address,
        })

        await apiGatewayManagementApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              event: 'updateBalances',
              updatedAt: new Date(lastUpdatedAt).toISOString(),
              data: 'cache',
            }),
          })
          .promise()

        return success({})
      }
    }

    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [contracts, tokens] = await Promise.all([
      getAllContractsInteractions(client, ctx.address),
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

    // Run adapters `getBalances` only with the contracts the user interacted with
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

    // Group balances back by adapter
    const pricedBalancesByAdapterId: { [key: string]: any[] } = {}
    for (const pricedBalance of pricedBalances) {
      if (pricedBalance.adapterId) {
        if (!pricedBalancesByAdapterId[pricedBalance.adapterId]) {
          pricedBalancesByAdapterId[pricedBalance.adapterId] = []
        }
        pricedBalancesByAdapterId[pricedBalance.adapterId].push(pricedBalance)
      }
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

    // Update balances
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

    const data: AdapterBalancesResponse[] = Object.keys(pricedBalancesByAdapterId).map((adapterId) => ({
      id: adapterId,
      data: pricedBalancesByAdapterId[adapterId],
    }))

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          event: 'updateBalances',
          updatedAt: now.toISOString(),
          data,
        }),
      })
      .promise()

    return success({})
  } catch (error) {
    console.error('Failed to update balances', { error, address })
    return serverError('Failed to update balances')
  } finally {
    client.release(true)
  }
}

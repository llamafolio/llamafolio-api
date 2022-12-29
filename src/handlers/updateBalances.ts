import { adapterById } from '@adapters/index'
import { selectAdaptersProps } from '@db/adapters'
import { deleteUpdateBalancesStatus, insertBalances } from '@db/balances'
import { BalancesSnapshot, insertBalancesSnapshots } from '@db/balances-snapshots'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import { getAllTokensInteractions } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { Balance, BalancesConfig, BalancesContext, PricedBalance } from '@lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '@lib/array'
import { sanitizeBalances, sumBalances } from '@lib/balance'
import { isHex, strToBuf } from '@lib/buf'
import { Chain } from '@lib/chains'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import format from 'pg-format'

type ExtendedBalance =
  | (Balance & {
      adapterId: string
    })
  | (PricedBalance & {
      adapterId: string
    })

interface ExtendedBalancesConfig extends BalancesConfig {
  adapterId: string
  chain: Chain
  balances: ExtendedBalance[]
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false // !important to reuse pool

  const { address } = event as APIGatewayProxyEvent & { address?: string }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  console.log('Update balances of address', address)

  const client = await pool.connect()

  try {
    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [contracts, tokens] = await Promise.all([
      getAllContractsInteractions(client, address),
      getAllTokensInteractions(client, address),
    ])

    const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')
    contractsByAdapterIdChain['wallet'] = groupBy(tokens, 'chain')

    const adapterIds = Object.keys(contractsByAdapterIdChain)
    // list of all [adapterId, chain]
    const adapterIdsChains = adapterIds.flatMap((adapterId) =>
      Object.keys(contractsByAdapterIdChain[adapterId]).map((chain) => [adapterId, chain] as [string, Chain]),
    )
    const adaptersProps = await selectAdaptersProps(client, adapterIdsChains)
    const adaptersPropsByIdChain = keyBy2(adaptersProps, 'id', 'chain')

    console.log('Interacted with protocols:', adapterIds)

    // Run adapters `getBalances` only with the contracts the user interacted with
    const adaptersBalancesConfigsRes = await Promise.all(
      adapterIdsChains.map(async ([adapterId, chain]) => {
        const adapter = adapterById[adapterId]
        if (!adapter) {
          console.error(`Could not find adapter with id`, adapterId)
          return
        }
        const handler = adapter[chain]
        if (!handler) {
          console.error(`Could not find chain handler for`, [adapterId, chain])
          return
        }

        try {
          const hrstart = process.hrtime()

          const contracts = groupContracts(contractsByAdapterIdChain[adapterId][chain]) || []
          const props = adaptersPropsByIdChain[adapterId]?.[chain]?.contractsProps || {}

          const ctx: BalancesContext = { address, chain, adapterId }

          const balancesConfig = await handler.getBalances(ctx, contracts, props)

          const hrend = process.hrtime(hrstart)

          console.log(
            `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesConfig.balances.length} balances in %ds %dms`,
            hrend[0],
            hrend[1] / 1000000,
          )

          const extendedBalancesConfig: ExtendedBalancesConfig = {
            ...balancesConfig,
            // Tag balances with adapterId
            balances: balancesConfig.balances.map((balance) => ({ ...balance, adapterId })),
            adapterId,
            chain,
          }

          return extendedBalancesConfig
        } catch (error) {
          console.error(`[${adapterId}][${chain}]: Failed to getBalances`, error)
          return
        }
      }),
    )

    const adaptersBalancesConfigs = adaptersBalancesConfigsRes.filter(isNotNullish)

    // Ungroup balances to make only 1 call to the price API
    const balances = adaptersBalancesConfigs.flatMap((balanceConfig) => balanceConfig?.balances).filter(isNotNullish)

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
    const pricedBalancesByAdapterId = groupBy(
      (pricedBalances as ExtendedBalance[]).filter((pricedBalance) => pricedBalance.adapterId),
      'adapterId',
    )

    const now = new Date()

    const balancesSnapshots = adaptersBalancesConfigs
      .map((balanceConfig) => {
        const pricedBalances = pricedBalancesByAdapterId[balanceConfig.adapterId]
        if (!pricedBalances) {
          return null
        }

        const balancesSnapshot: BalancesSnapshot = {
          fromAddress: address,
          adapterId: balanceConfig.adapterId,
          chain: balanceConfig.chain,
          balanceUSD: sumBalances(
            pricedBalances.filter((balance) => isNotNullish(balance) && balance.chain === balanceConfig.chain),
          ),
          timestamp: now,
          healthFactor: balanceConfig.healthFactor,
        }

        return balancesSnapshot
      })
      .filter(isNotNullish)

    // Update balances
    await client.query('BEGIN')

    // Insert balances snapshots
    await insertBalancesSnapshots(client, balancesSnapshots)

    // Delete old balances
    await client.query(format('delete from balances where from_address = %L::bytea', strToBuf(address)), [])

    // Insert new balances
    // TODO: insert all at once
    await Promise.all(
      Object.keys(pricedBalancesByAdapterId).map((adapterId) =>
        insertBalances(client, pricedBalancesByAdapterId[adapterId] as PricedBalance[], adapterId, address, now),
      ),
    )

    await client.query('COMMIT')

    return success({})
  } catch (error) {
    console.error('Failed to update balances', { error, address })
    return serverError('Failed to update balances')
  } finally {
    await deleteUpdateBalancesStatus(address)
    client.release(true)
  }
}

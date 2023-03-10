import { adapterById } from '@adapters/index'
import { selectDefinedAdaptersContractsProps } from '@db/adapters'
import { Balance as BalanceStore, insertBalances } from '@db/balances'
import { BalancesGroup, insertBalancesGroups } from '@db/balances-groups'
import { getAllContractsInteractions, groupContracts } from '@db/contracts'
import { getAllTokensInteractions } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, serverError, success } from '@handlers/response'
import { Balance, BalancesConfig, BalancesContext, PricedBalance } from '@lib/adapter'
import { groupBy, groupBy2, keyBy2 } from '@lib/array'
import { balancesTotalBreakdown, sanitizeBalances } from '@lib/balance'
import { isHex } from '@lib/buf'
import { Chain } from '@lib/chains'
import { getPricedBalances } from '@lib/price'
import { isNotNullish } from '@lib/type'
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

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
    const [contracts, tokens, adaptersContractsProps] = await Promise.all([
      getAllContractsInteractions(client, address),
      getAllTokensInteractions(client, address),
      selectDefinedAdaptersContractsProps(client),
    ])

    const contractsByAdapterIdChain = groupBy2(contracts, 'adapterId', 'chain')
    contractsByAdapterIdChain['wallet'] = groupBy(tokens, 'chain')
    const adaptersContractsPropsByIdChain = keyBy2(adaptersContractsProps, 'id', 'chain')
    // add adapters with contracts_props, even if there was no user interaction with any of the contracts
    for (const adapter of adaptersContractsProps) {
      if (!contractsByAdapterIdChain[adapter.id]) {
        contractsByAdapterIdChain[adapter.id] = {}
      }
      if (!contractsByAdapterIdChain[adapter.id][adapter.chain]) {
        contractsByAdapterIdChain[adapter.id][adapter.chain] = []
      }
    }

    const adapterIds = Object.keys(contractsByAdapterIdChain)
    // list of all [adapterId, chain]
    const adapterIdsChains = adapterIds.flatMap((adapterId) =>
      Object.keys(contractsByAdapterIdChain[adapterId]).map((chain) => [adapterId, chain] as [string, Chain]),
    )

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
          const props = adaptersContractsPropsByIdChain[adapterId]?.[chain]?.contractsProps || {}

          const ctx: BalancesContext = { address, chain, adapterId }

          const balancesConfig = await handler.getBalances(ctx, contracts, props)

          const hrend = process.hrtime(hrstart)

          console.log(
            `[${adapterId}][${chain}] getBalances ${contractsByAdapterIdChain[adapterId][chain].length} contracts, found ${balancesConfig.groups[0].balances.length} balances in %ds %dms`,
            hrend[0],
            hrend[1] / 1000000,
          )

          // TODO: add full support for groups of balances
          const extendedBalancesConfig: ExtendedBalancesConfig = {
            ...balancesConfig,
            // Tag balances with adapterId
            balances: balancesConfig.groups[0].balances.map((balance) => ({ ...balance, adapterId })),
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

    const balancesGroupsStore: BalancesGroup[] = []
    const balancesStore: BalanceStore[] = []

    for (const balanceConfig of adaptersBalancesConfigs) {
      const pricedBalances = pricedBalancesByAdapterId[balanceConfig.adapterId]
      if (!pricedBalances) {
        continue
      }

      const balances = pricedBalances.filter(
        (balance) => isNotNullish(balance) && balance.chain === balanceConfig.chain,
      )

      // TODO: add full support for groups of balances
      const balancesByCategory = groupBy(balances, 'category')

      for (const category in balancesByCategory) {
        const id = uuidv4()

        const balancesGroup: BalancesGroup = {
          id,
          fromAddress: address,
          adapterId: balanceConfig.adapterId,
          chain: balanceConfig.chain,
          category,
          ...balancesTotalBreakdown(balancesByCategory[category]),
          timestamp: now,
          healthFactor: balanceConfig.healthFactor,
        }

        for (const balance of balancesByCategory[category]) {
          balancesStore.push({ groupId: id, ...balance })
        }

        balancesGroupsStore.push(balancesGroup)
      }
    }

    // Update balances
    await client.query('BEGIN')

    // Insert balances groups
    await insertBalancesGroups(client, balancesGroupsStore)

    // Insert balances
    await insertBalances(client, balancesStore)

    await client.query('COMMIT')

    return success({})
  } catch (error) {
    console.error('Failed to update balances', { error, address })
    return serverError('Failed to update balances')
  } finally {
    client.release(true)
  }
}

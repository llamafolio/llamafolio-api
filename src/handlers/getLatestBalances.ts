import { selectBalancesWithGroupsAndYieldsByFromAddress } from '@db/balances'
import { selectAreBalancesStaleByFromAddress } from '@db/balances-groups'
import pool from '@db/pool'
import { selectYieldsIn } from '@db/yields'
import type { BalancesResponse, Yield } from '@handlers/getBalances'
import { formatBalancesGroups } from '@handlers/getBalances'
import { badRequest, serverError, success } from '@handlers/response'
import { updateBalances } from '@handlers/updateBalances'
import { BALANCE_UPDATE_THRESHOLD_SEC } from '@lib/balance'
import { isHex } from '@lib/buf'
import type { Chain } from '@lib/chains'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import type { PoolClient } from 'pg'

async function withYields(client: PoolClient, balancesGroups: any[]) {
  // [chain, adapterId, poolAddress]
  const yieldsValues: [Chain, string, string][] = []

  for (const balanceGroup of balancesGroups) {
    for (const balance of balanceGroup.balances) {
      yieldsValues.push([balanceGroup.chain, balanceGroup.adapterId, balance.address])
    }
  }

  // fetch yields
  const yields = await selectYieldsIn(client, yieldsValues)

  // collect yields by [chain, adapterId, address] and attach them to balances
  const yieldsByKey: { [key: string]: Yield } = {}

  for (const y of yields) {
    yieldsByKey[`${y.chain}-${y.adapterId}-${y.address}`] = y
  }

  for (const balanceGroup of balancesGroups) {
    for (const balance of balanceGroup.balances) {
      const yieldKey = `${balanceGroup.chain}-${balanceGroup.adapterId}-${balance.address}`
      if (yieldsByKey[yieldKey]) {
        balance.apy = yieldsByKey[yieldKey].apy
        balance.apyBase = yieldsByKey[yieldKey].apyBase
        balance.apyReward = yieldsByKey[yieldKey].apyReward
        balance.apyMean30d = yieldsByKey[yieldKey].apyMean30d
        balance.ilRisk = yieldsByKey[yieldKey].ilRisk
      }
    }
  }

  return balancesGroups
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address as `0x${string}`
  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  console.log('Get latest balances', address)

  const client = await pool.connect()

  try {
    let balancesGroups = []

    const isStale = await selectAreBalancesStaleByFromAddress(client, address)
    if (isStale) {
      console.log('Update balances')

      balancesGroups = await updateBalances(client, address)
      balancesGroups = await withYields(client, balancesGroups)
    } else {
      balancesGroups = await selectBalancesWithGroupsAndYieldsByFromAddress(client, address)
    }

    const updatedAt = balancesGroups[0]?.timestamp ? new Date(balancesGroups[0]?.timestamp).getTime() : undefined

    const balancesResponse: BalancesResponse = {
      status: 'success',
      updatedAt: updatedAt === undefined ? undefined : Math.floor(updatedAt / 1000),
      groups: formatBalancesGroups(balancesGroups),
    }

    return success(balancesResponse, { maxAge: BALANCE_UPDATE_THRESHOLD_SEC })
  } catch (error) {
    console.error('Failed to retrieve balances', { error, address })
    return serverError('Failed to retrieve balances')
  } finally {
    client.release(true)
  }
}

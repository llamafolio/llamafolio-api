import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import type { CalendarEvent } from '@lib/calendar'
import { chainByChainId } from '@lib/chains'
import { toStartOfDay, unixFromDate } from '@lib/fmt'

/**
 * @param client
 * @param address wallet
 */
export async function selectCalendarEvents(client: ClickHouseClient, address: string) {
  const queryRes = await client.query({
    query: `
      SELECT
        "chain",
        "adapter_id",
        "timestamp",
        "balances",
        "governance_proposals"
      FROM ${environment.NS_LF}.adapters_balances AS ab
      LEFT JOIN (
        SELECT
          "chain",
          "protocol_id",
          groupArray("data") as "governance_proposals"
        FROM ${environment.NS_LF}.governance_proposals
        GROUP BY "chain", "protocol_id", "id"
      ) AS gp ON (ab."chain", ab."adapter_id") = (gp."chain", gp."protocol_id")
      WHERE
        "from_address" = {fromAddress: String} AND
        "timestamp" = (SELECT max("timestamp") AS "timestamp" FROM ${environment.NS_LF}.adapters_balances WHERE "from_address" = {fromAddress: String})
    `,
    query_params: {
      fromAddress: address.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      adapter_id: string
      timestamp: string
      balances: string[]
      governance_proposals: string[]
    }[]
  }

  const calendarEvents: CalendarEvent[] = []

  for (const row of res.data) {
    const chain = chainByChainId[parseInt(row.chain)]?.id
    if (!chain) {
      console.error(`Could not find chain ${row.chain}`)
      continue
    }

    const balances = row.balances.map((str) => JSON.parse(str))
    const governanceProposals = row.governance_proposals.map((str) => JSON.parse(str))

    for (const balance of balances) {
      if (balance.category === 'lock' && balance.unlockAt != null) {
        calendarEvents.push({
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          type: 'unlock',
        })
      } else if (balance.category === 'vest' && balance.unlockAt != null) {
        calendarEvents.push({
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          type: 'vest',
        })
      }
    }

    for (const governanceProposal of governanceProposals) {
      calendarEvents.push({
        governanceProposal,
        chain,
        startDate: governanceProposal.start,
        endDate: governanceProposal.end,
        protocol: row.adapter_id,
        type: 'governance_proposal',
      })
    }
  }

  const today = unixFromDate(toStartOfDay(new Date()))

  // filter past events
  return calendarEvents.filter((event) => {
    if (event.endDate != null && event.endDate < today) {
      return false
    }

    if (event.startDate != null && event.startDate < today) {
      return false
    }

    return true
  })
}

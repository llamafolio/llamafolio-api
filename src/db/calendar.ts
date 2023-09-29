import type { ClickHouseClient } from '@clickhouse/client'
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
      WITH "sub_balances" AS (
        SELECT
          "chain",
          "adapter_id",
          "timestamp",
          "balances",
          "parent_id"
        FROM lf.adapters_balances AS ab
        LEFT JOIN lf.adapters AS a ON (a.chain, a.id) = (ab.chain, ab.adapter_id)
        WHERE
          "from_address" = {fromAddress: String} AND
          "timestamp" = (SELECT max("timestamp") AS "timestamp" FROM lf.adapters_balances WHERE "from_address" = {fromAddress: String})
      ),
      "sub_governance_proposals" AS (
          SELECT
            "chain",
            "protocol_id",
            groupUniqArray("data") as "governance_proposals"
          FROM lf.governance_proposals
          WHERE "end_time" >= toStartOfDay(now())
          GROUP BY "chain", "protocol_id"
      )
      SELECT
        ab.chain as chain,
          ab.adapter_id as adapter_id,
          ab.timestamp as timestamp,
          ab.balances as balances,
          ab.parent_id as parent_id,
          gp.governance_proposals as governance_proposals
      FROM "sub_balances" AS ab
      LEFT JOIN sub_governance_proposals AS gp ON
        (ab."chain", ab."adapter_id") = (gp."chain", gp."protocol_id") OR
        (ab."chain", ab."parent_id") = (gp."chain", gp."protocol_id")
    `,
    query_params: {
      fromAddress: address.toLowerCase(),
    },
  })

  const res = (await queryRes.json()) as {
    data: {
      chain: string
      adapter_id: string
      parent_id: string
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
    const today = unixFromDate(toStartOfDay(new Date()))

    for (const balance of balances) {
      if (balance.category === 'lock' && balance.unlockAt != null && balance.unlockAt >= today) {
        calendarEvents.push({
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          parentProtocol: row.parent_id,
          type: 'unlock',
        })
      } else if (balance.category === 'vest' && balance.unlockAt != null && balance.unlockAt >= today) {
        calendarEvents.push({
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          parentProtocol: row.parent_id,
          type: 'vest',
        })
      }
    }

    // Note: past proposals are filtered out in the DB layer
    for (const governanceProposal of governanceProposals) {
      calendarEvents.push({
        governanceProposal,
        chain,
        startDate: governanceProposal.start,
        endDate: governanceProposal.end,
        protocol: row.adapter_id,
        parentProtocol: row.parent_id,
        type: 'governance_proposal',
      })
    }
  }

  return calendarEvents.sort((a, b) => a.startDate - b.startDate)
}

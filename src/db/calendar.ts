import type { ClickHouseClient } from '@clickhouse/client'
import type { CalendarEvent } from '@lib/calendar'
import { chainByChainId } from '@lib/chains'
import { toStartOfDay, unixFromDate } from '@lib/fmt'

/**
 * Return calendar upcoming events (including today's events):
 * - token vest end
 * - token lock end
 * - governance proposal (non closed) of protocols the user is invested in
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
          WHERE "end_time" >= toStartOfDay(now()) AND "status" <> 'closed'
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

  const calendarEventByKey: { [key: string]: CalendarEvent } = {}

  for (const row of res.data) {
    const chain = chainByChainId[parseInt(row.chain)]?.id
    if (!chain) {
      console.error(`Could not find chain ${row.chain}`)
      continue
    }

    const balances = row.balances.map((str) => JSON.parse(str))
    const governanceProposals = row.governance_proposals.map((str) => JSON.parse(str))
    const today = unixFromDate(toStartOfDay(new Date()))

    for (let balanceIdx = 0; balanceIdx < balances.length; balanceIdx++) {
      const balance = balances[balanceIdx]

      if (balance.category === 'lock' && balance.unlockAt != null && balance.unlockAt >= today) {
        const key = `lock_${chain}_${row.adapter_id}_${balanceIdx}`

        calendarEventByKey[key] = {
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          parentProtocol: row.parent_id,
          type: 'unlock',
        }
      } else if (balance.category === 'vest' && balance.unlockAt != null && balance.unlockAt >= today) {
        const key = `vest_${chain}_${row.adapter_id}_${balanceIdx}`

        calendarEventByKey[key] = {
          balance,
          chain,
          startDate: balance.unlockAt,
          protocol: row.adapter_id,
          parentProtocol: row.parent_id,
          type: 'vest',
        }
      }
    }

    // Note: past proposals are filtered out in the DB layer
    for (const governanceProposal of governanceProposals) {
      // Note: remove duplicates (left join on balances can yield the same goverance proposal multiple times)
      const key = `governance_proposal_${chain}_${row.parent_id || row.adapter_id}_${governanceProposal.id}`

      calendarEventByKey[key] = {
        governanceProposal,
        chain,
        startDate: governanceProposal.start,
        endDate: governanceProposal.end,
        protocol: row.adapter_id,
        parentProtocol: row.parent_id,
        type: 'governance_proposal',
      }
    }
  }

  return Object.values(calendarEventByKey).sort((a, b) => a.startDate - b.startDate)
}

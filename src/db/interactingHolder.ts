import type { ClickHouseClient } from '@clickhouse/client'
import { chainByChainId } from '@lib/chains'
import { toYYYYMMDD } from '@lib/fmt'

interface TokenHolder {
  chain: string
  adapterId: string
  holders: string[]
  address: string
}

export interface TokenHoldersMap {
  [address: string]: TokenHolder
}

export async function selectInteractingTokenHolders(
  client: ClickHouseClient,
  chainId: number,
  adapterId: string,
  startTimestamp: number,
  endTimestamp: number,
) {
  const startDate = toYYYYMMDD(startTimestamp * 1000).replace(/-/g, '')
  const endDate = toYYYYMMDD(endTimestamp * 1000).replace(/-/g, '')

  const query = `
    WITH "protocol_contracts" AS (
      SELECT
        "address",
        "token",
        argMax("category", "created_at") AS "category",
        argMax("data", "created_at") AS "data"
      FROM lf.adapters_contracts
      WHERE
        "chain" = ${chainId} AND
        "adapter_id" = '${adapterId}'
      GROUP BY "address", "token"
      HAVING sum("sign") > 0
    ),
    "transactions" AS (
      SELECT
        "to_address",
        groupUniqArray("from_address") AS "holders"
      FROM evm_indexer2.transactions_to_mv
      WHERE
        ("to_short", "to_address") IN (
            SELECT
              substring("address", 1, 10),
              "address"
            FROM "protocol_contracts"
        ) AND
        toDate(timestamp) >= '${startDate}' AND
        toDate(timestamp) <= '${endDate}' AND
        chain = ${chainId}
      GROUP BY "to_address"
    )
    SELECT
      "holders",
      "address",
      "token",
      "category",
      "data"
    FROM "transactions" AS "t"
    LEFT JOIN "protocol_contracts" AS "c" ON (t."to_address" = c."address");
  `

  const queryRes = await client.query({ query })
  const res = (await queryRes.json()) as { data: TokenHolder[] }

  return res.data.reduce((acc: TokenHoldersMap, cur) => {
    acc[cur.address] = {
      chain: chainByChainId[chainId].id,
      adapterId: adapterId,
      holders: cur.holders,
      address: cur.address,
    }
    return acc
  }, {})
}

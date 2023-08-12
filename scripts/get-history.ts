import { connect } from '@db/clickhouse'

async function main() {
  const client = connect()

  try {
    const from = '0x21a31ee1afc51d94c2efccaa2092ad1028285549'

    const queryRes = await client.query({
      query: `
        WITH txs_pk AS (
          SELECT "chain", "timestamp", "hash" FROM evm_indexer.transactions WHERE "from" = {from: String} OR "to" = {from: String}
          UNION ALL
          SELECT "chain", "timestamp", "transaction_hash" AS "hash" FROM evm_indexer.token_transfers WHERE "from" = {from: String} OR "to" = {from: String}
          GROUP BY ("chain", "timestamp", "hash")
          ORDER BY "timestamp" DESC
          LIMIT 10
        )
        SELECT
          txs."block_number",
          txs."chain",
          txs."timestamp",
          txs."hash",
          txs."from",
          txs."value",
          txs."gas_price",
          txs."gas_used",
          txs."status",
          transfers."type" AS "transfer_type",
          transfers."value" AS "transfer_value"
        FROM evm_indexer.transactions txs
        LEFT JOIN evm_indexer.token_transfers transfers ON (transfers."chain", transfers."timestamp", transfers."transaction_hash") = (txs."chain", txs."timestamp", txs."hash")
        WHERE ("chain", "timestamp", "hash") IN txs_pk
        ORDER BY "timestamp" DESC;
      `,
      query_params: {
        from,
      },
    })

    const res = await queryRes.json()

    console.log(res)
  } catch (e) {
    console.log('Failed to update protocols', e)
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

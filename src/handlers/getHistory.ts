import { strToBuf, bufToStr } from "../lib/buf";
import pool from "../db/pool";

module.exports.handler = async (event, context) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  let address = event.pathParameters?.address;
  if (!address) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing address parameter",
      }),
    };
  }

  const client = await pool.connect();

  try {
    const transactionsRes = await client.query(
      `
select * from all_transactions_history($1::bytea)
order by timestamp desc
limit 25;
`,
      [strToBuf(address)]
    );

    const transactions = transactionsRes.rows.map((transaction) => ({
      ...transaction,
      from_address: bufToStr(transaction.from_address),
      to_address: bufToStr(transaction.to_address),
      hash: bufToStr(transaction.hash),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: transactions,
      }),
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve history",
      }),
    };
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
};

const { Pool } = require("pg");
const { parseTransaction, strToBuf, bufToStr } = require("../lib/models");

// See: https://gist.github.com/streamich/6175853840fb5209388405910c6cc04b
// connection details inherited from environment
const pool = new Pool({
  max: 1,
  min: 0,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 10000,
});

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

    const transactions = transactionsRes.rows.map(parseTransaction);

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

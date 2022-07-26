import { strToBuf, bufToStr } from "../lib/buf";
import pool from "../db/pool";
import { getBalances as getERC20Balances } from "../lib/erc20";

module.exports.handler = async (event, context) => {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const address = event.pathParameters?.address;
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
    // TODO: filter ERC20 tokens only
    const tokensRes = await client.query(
      `select * from all_distinct_tokens_received($1::bytea) limit 500;`,
      [strToBuf(address)]
    );
    // const [tokensRes, contractsRes] = await Promise.all([
    //   client.query(
    //     `select * from all_distinct_tokens_received($1::bytea) limit 500;`,
    //     [strToBuf(address)]
    //   ),
    //   client.query(`select * from all_contract_interactions($1::bytea);`, [
    //     strToBuf(address),
    //   ]),
    // ]);

    // const contracts = contractsRes.rows.map((row) => ({
    //   chain: row.chain,
    //   address: bufToStr(row.contract_address),
    // }));

    const tokens = tokensRes.rows.map((row) => ({
      chain: row.chain,
      address: bufToStr(row.token_address),
    }));
    const balances = await getERC20Balances(tokens, address);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: balances,
      }),
    };
  } catch (e) {
    console.error("Failed to retrieve balances", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve balances",
      }),
    };
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
};

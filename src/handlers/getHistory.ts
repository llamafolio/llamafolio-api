import { APIGatewayProxyHandler } from "aws-lambda";
import { Chain } from "@defillama/sdk/build/general";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import { badRequest, serverError, success } from "./response";

type TokenTransfer = {
  token_address: string;
  from_address: string;
  to_address: string;
  value: string;
};

type Transaction = {
  chain: Chain;
  block_number: string;
  timestamp: string;
  hash: string;
  from_address: string;
  to_address: string;
  gas_used: string;
  gas_price: string;
  input_decoded_named_args: boolean;
  input_decoded: any;
  success: boolean;
  token_transfers: TokenTransfer[];
};

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  let address = event.pathParameters?.address;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  let before = new Date();
  if (event.queryStringParameters?.before) {
    const time = parseInt(event.queryStringParameters?.before);
    if (Number.isNaN(time)) {
      return badRequest("Invalid before query parameter, expected UNIX time");
    }
    before = new Date(time * 1000);
    if (Number.isNaN(before.getTime())) {
      return badRequest("Invalid before query parameter, expected UNIX time");
    }
  }

  const client = await pool.connect();

  try {
    const transactionsRes = await client.query(
      `
select * from all_transactions_history($1::bytea, $2, $3::timestamp)
order by b_timestamp desc;
`,
      [strToBuf(address), 20, before.toISOString()]
    );

    const transactionByChainHash: { [key: string]: Transaction } = {};

    for (const row of transactionsRes.rows) {
      const chain = row.chain;
      const hash = bufToStr(row.tx_hash);

      transactionByChainHash[`${chain}:${hash}`] = {
        chain,
        block_number: row.b_number,
        timestamp: row.b_timestamp,
        hash,
        from_address: bufToStr(row.tx_from_address),
        to_address: bufToStr(row.tx_to_address),
        gas_used: row.tx_gas_used,
        gas_price: row.tx_gas_price,
        input_decoded_named_args: row.tx_input_decoded_named_args,
        input_decoded: row.tx_input_decoded,
        success: row.tx_success,
        token_transfers: [],
      };
    }

    // aggregate token transfers on transactions
    for (const row of transactionsRes.rows) {
      if (!row.tt_transaction_hash) {
        continue;
      }

      const chain = row.chain;
      const hash = bufToStr(row.tt_transaction_hash);

      if (!transactionByChainHash[`${chain}:${hash}`]) {
        console.error(`Failed to find transaction with hash ${hash}`);
        return serverError(`Failed to find transaction with hash ${hash}`);
      }

      transactionByChainHash[`${chain}:${hash}`].token_transfers.push({
        token_address: bufToStr(row.tt_token_address),
        from_address: bufToStr(row.tt_from_address),
        to_address: bufToStr(row.tt_to_address),
        value: row.tt_value,
      });
    }

    const data = Object.values(transactionByChainHash);
    const payload: { data: Transaction[]; nextCursor?: number } = {
      data,
      nextCursor: undefined,
    };

    const nextCursorTimestamp = data[data.length - 1]?.timestamp;
    if (nextCursorTimestamp) {
      payload.nextCursor = new Date(nextCursorTimestamp).getTime() / 1000;
    }

    return success(payload, { maxAge: 2 * 60 });
  } catch (e) {
    console.error("Failed to retrieve history", e);
    return serverError("Failed to retrieve history");
  } finally {
    client.release(true);
  }
};

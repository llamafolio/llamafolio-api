import format from "pg-format";
import { APIGatewayProxyHandler } from "aws-lambda";
import { Chain } from "@defillama/sdk/build/general";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import { badRequest, serverError, success } from "@handlers/response";

type TokenTransfer = {
  symbol?: string;
  decimals?: number;
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
  input_function_name: string;
  success: boolean;
  adapter_id?: string | null;
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
    // Get all transactions from and to this address
    // TODO: retrieve token transfers received by this address
    const transactionsRes = await client.query(
      "select * from all_transactions_history($1::bytea, $2, $3::timestamp);",
      [strToBuf(address), 20, before.toISOString()]
    );

    const addr = strToBuf(address);
    const transactionByChainHash: { [key: string]: Transaction } = {};
    const transactionRowsByChains: { [key: string]: any[] } = {};

    for (const row of transactionsRes.rows) {
      if (!transactionRowsByChains[row.chain]) {
        transactionRowsByChains[row.chain] = [];
      }
      transactionRowsByChains[row.chain].push(row);

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
        input_function_name: row.tx_input_function_name,
        success: row.tx_success,
        // TODO: adapter_id can have multiple values because contracts table has duplicates
        // adapter_id: row.adapter_id,
        token_transfers: [],
      };
    }

    // Aggregate token transfers:
    // - by transaction_hash for each chain
    // - filter out internal token transfers (only keep those that go from_ and to_ the address)
    let tokenTransfersQuery = "";
    for (const chain in transactionRowsByChains) {
      const transactionHashes = [];
      for (const row of transactionRowsByChains[chain]) {
        transactionHashes.push(row.tx_hash);
      }

      tokenTransfersQuery +=
        format(
          `
      select 
        %L::varchar as chain,
        tt.log_index as tt_log_index,
        tt.token_address as tt_token_address,
        tt.from_address as tt_from_address,
        tt.to_address as tt_to_address,
        tt.value as tt_value,
        tt.transaction_hash as tt_transaction_hash,
        c.symbol as tt_symbol,
        c.decimals as tt_decimals
      from %I.token_transfers tt
      left join contracts c on (
        c.address = tt.token_address and c.chain = %L
      )
      where (
        (
          tt.from_address = %L or
          tt.to_address = %L
        ) and
        tt.transaction_hash in ( %L )
      )`,
          chain,
          chain,
          chain,
          addr,
          addr,
          transactionHashes
        ) + " union all ";
    }

    // remove last ' union all '
    tokenTransfersQuery = tokenTransfersQuery.slice(0, -10);

    const tokenTransfersRes = await client.query(tokenTransfersQuery);

    // aggregate token transfers on transactions
    for (const row of tokenTransfersRes.rows) {
      if (!row.tt_transaction_hash) {
        continue;
      }

      const chain = row.chain;
      const hash = bufToStr(row.tt_transaction_hash);

      if (!transactionByChainHash[`${chain}:${hash}`]) {
        console.error(`Failed to find transaction with hash ${hash}`);
        continue;
      }

      transactionByChainHash[`${chain}:${hash}`].token_transfers.push({
        symbol: row.tt_symbol,
        decimals:
          row.tt_decimals != null ? parseInt(row.tt_decimals) : row.tt_decimals,
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

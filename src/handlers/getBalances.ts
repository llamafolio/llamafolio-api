import { ApiGatewayManagementApi } from "aws-sdk";
import format from "pg-format";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import {
  Balance,
  BaseContext,
  BaseContract,
  PricedBalance,
  Adapter,
} from "@lib/adapter";
import { getPricedBalances } from "@lib/price";
import { adapters, adapterById } from "@adapters/index";
import { badRequest, serverError, success } from "./response";
import { mulPrice } from "@lib/math";
import { invokeLambda } from "@lib/lambda";

type AdapterBalance = Balance & { adapterId: string };
type PricedAdapterBalance = PricedBalance & { adapterId: string };

type AdapterBalancesResponse = Pick<
  Adapter,
  "id" | "name" | "description" | "coingecko" | "defillama" | "links"
> & {
  data: (AdapterBalance | PricedAdapterBalance)[];
};

function groupBalancesByAdapter(
  balances: (AdapterBalance | PricedAdapterBalance)[]
) {
  const balancesByAdapterId: {
    [key: string]: AdapterBalancesResponse;
  } = {};
  for (const balance of balances) {
    if (!balancesByAdapterId[balance.adapterId]) {
      balancesByAdapterId[balance.adapterId] = {
        ...adapterById[balance.adapterId],
        data: [],
      };
    }
    balancesByAdapterId[balance.adapterId].data.push(balance);
  }

  return Object.values(balancesByAdapterId);
}

export async function handler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const address = event.pathParameters?.address;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const client = await pool.connect();

  try {
    const balancesRes = await client.query(
      `
select * from (
  select timestamp from balances 
  where from_address = $1::bytea
  order by timestamp desc 
  limit 1
) ts
inner join balances on balances.timestamp = ts.timestamp;`,
      [strToBuf(address)]
    );

    const pricedBalances: (AdapterBalance | PricedAdapterBalance)[] =
      balancesRes.rows.map((d) => ({
        chain: d.chain,
        address: bufToStr(d.address),
        symbol: d.symbol,
        decimals: d.decimals,
        amount: d.amount,
        category: d.category,
        adapterId: d.adapter_id,
        price: parseFloat(d.price),
        priceTimestamp: d.price_timestamp,
        balanceUSD:
          d.amount != null && d.decimals != null && d.price != null
            ? mulPrice(d.amount, d.decimals, d.price)
            : undefined,
        timestamp: d.timestamp,
        reward: d.reward,
        debt: d.debt,
        stable: d.stable,
        parent: d.parent ? bufToStr(d.parent) : undefined,
        claimable: d.claimable,
        claimableUSD:
          d.claimable != null && d.decimals != null && d.price != null
            ? mulPrice(d.claimable, d.decimals, d.price)
            : undefined,
      }));

    const data = groupBalancesByAdapter(pricedBalances);
    let updatedAt = data[0]?.data?.[0].timestamp ?? new Date().toISOString();

    return success({ updatedAt, data });
  } catch (e) {
    console.error("Failed to retrieve balances", e);
    return serverError("Failed to retrieve balances");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

export async function websocketUpdateAdaptersHandler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const { connectionId, address } = event;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const client = await pool.connect();

  try {
    // const [tokensRes /*contractsRes*/] = await Promise.all([
    // TODO: filter ERC20 tokens only
    // client.query(
    //   `select * from all_distinct_tokens_received($1::bytea) limit 500;`,
    //   [strToBuf(address)]
    // ),
    // client.query(`select * from all_contract_interactions($1::bytea);`, [
    //   strToBuf(address),
    // ]),
    // client.query(`select * from distinct_transactions_to($1::bytea);`, [
    //   strToBuf(address),
    // ]),
    // ]);

    // const contracts = contractsRes.rows.map((row) => [
    //   row.chain,
    //   row.to_address,
    // ]);

    // TODO: optimization when chains are synced: only run the adapters of protocols the user interacted with

    const now = new Date();

    // run each adapter in a Lambda
    await Promise.all(
      adapters.map((adapter) =>
        invokeLambda(
          `llamafolio-api-${process.env.stage}-websocketUpdateAdapterBalances`,
          {
            connectionId,
            address,
            adapterId: adapter.id,
            timestamp: now.getTime(),
          },
          "RequestResponse"
        )
      )
    );

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          event: "updateBalances",
          updatedAt: now.toISOString(),
          data: "end",
        }),
      })
      .promise();

    return success({});
  } catch (e) {
    console.error("Failed to update balances", e);
    return serverError("Failed to update balances");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

/**
 * getBalances of given adapter, and push the response to the websocket connection
 * @param event
 * @param context
 * @returns
 */
export async function websocketUpdateAdapterBalancesHandler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const { connectionId, address, adapterId, timestamp } = event;
  const adapter = adapterById[adapterId];
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }
  if (!adapter) {
    return badRequest(
      `Invalid adapterId parameter, adapter '${adapterId}' not found`
    );
  }

  const ctx: BaseContext = { address };

  const client = await pool.connect();

  try {
    const adaptersContractsRes = await client.query(
      "select * from adapters_contracts where adapter_id = $1;",
      [adapterId]
    );

    const contracts: BaseContract[] = adaptersContractsRes.rows.map(
      (row: any) => ({
        chain: row.chain,
        address: bufToStr(row.address),
        ...row.data,
      })
    );

    const balancesConfig = await adapter.getBalances(ctx, contracts || []);

    const pricedBalances = await getPricedBalances(balancesConfig.balances);

    const now = new Date(timestamp);

    // insert balances
    const insertBalancesValues = pricedBalances.map((d) => [
      strToBuf(address),
      d.chain,
      strToBuf(d.address),
      d.symbol,
      d.decimals,
      d.amount.toString(),
      d.category,
      adapterId,
      (d as PricedBalance).price,
      (d as PricedBalance).timestamp
        ? new Date((d as PricedBalance).timestamp)
        : undefined,
      now,
      d.reward,
      d.debt,
      d.stable,
      d.parent ? strToBuf(d.parent) : undefined,
      d.claimable?.toString(),
    ]);

    await client.query(
      format(
        "INSERT INTO balances (from_address, chain, address, symbol, decimals, amount, category, adapter_id, price, price_timestamp, timestamp, reward, debt, stable, parent, claimable) VALUES %L;",
        insertBalancesValues
      ),
      []
    );

    const data = { ...adapter, data: pricedBalances };

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          event: "updateBalances",
          updatedAt: now.toISOString(),
          data,
        }),
      })
      .promise();

    return success({});
  } catch (e) {
    console.error("Failed to update balances", e);
    return serverError("Failed to update balances");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

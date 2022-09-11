import { APIGatewayProxyHandler } from "aws-lambda";
import { ApiGatewayManagementApi } from "aws-sdk";
import format from "pg-format";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import { BaseContext, BaseContract, PricedBalance } from "@lib/adapter";
import { getPricedBalances } from "@lib/price";
import { adapters, adapterById } from "@adapters/index";
import { badRequest, serverError, success } from "./response";
import { invokeLambda } from "@lib/lambda";

export const websocketUpdateAdaptersHandler: APIGatewayProxyHandler = async (
  event,
  context
) => {
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

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    const balancesRes = await client.query(
      `select timestamp from balances where from_address = $1::bytea limit 1;`,
      [strToBuf(address)]
    );

    if (balancesRes.rows.length === 1) {
      const lastUpdatedAt = new Date(balancesRes.rows[0].timestamp).getTime();
      const now = new Date().getTime();
      // 2 minutes delay
      if (now - lastUpdatedAt < 2 * 60 * 1000) {
        console.log("Update adapters balances cache", {
          now,
          lastUpdatedAt,
          address,
        });

        await apiGatewayManagementApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              event: "updateBalances",
              updatedAt: new Date(lastUpdatedAt).toISOString(),
              data: "cache",
            }),
          })
          .promise();

        return success({});
      }
    }

    // TODO: optimization when chains are synced: only run the adapters of protocols the user interacted with
    console.log("Update adapters balances", {
      adapterIds: adapters.map((a) => a.id),
      address,
    });

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
  } catch (error) {
    console.error("Failed to update balances", { error, address });
    return serverError("Failed to update balances");
  } finally {
    client.release(true);
  }
};

/**
 * getBalances of given adapter, and push the response to the websocket connection
 */
export const websocketUpdateAdapterBalancesHandler: APIGatewayProxyHandler =
  async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

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

      console.log("Update adapter balances", {
        adapterId: adapter.id,
        address,
      });

      const balancesConfig = await adapter.getBalances(ctx, contracts || []);

      const pricedBalances = await getPricedBalances(balancesConfig.balances);

      console.log("Found balances", {
        adapterId: adapter.id,
        address,
        pricedBalances,
      });

      const now = new Date(timestamp);

      // insert underlyings
      for (const balance of pricedBalances) {
        if (balance.underlyings) {
          for (const underlyingBalance of balance.underlyings) {
            underlyingBalance.parent = balance.address;
            underlyingBalance.type = "underlying";
            pricedBalances.push(underlyingBalance);
          }
        }
      }

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
        d.balanceUSD,
        d.claimableUSD,
        d.type,
      ]);

      await client.query("BEGIN");

      // Delete old balances
      await client.query(
        "delete from balances where from_address = $1::bytea and adapter_id = $2",
        [strToBuf(address), adapterId]
      );

      // Insert new balances
      if (insertBalancesValues.length > 0) {
        await client.query(
          format(
            "INSERT INTO balances (from_address, chain, address, symbol, decimals, amount, category, adapter_id, price, price_timestamp, timestamp, reward, debt, stable, parent, claimable, balance_usd, claimable_usd, type) VALUES %L;",
            insertBalancesValues
          ),
          []
        );
      }

      await client.query("COMMIT");

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
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to update balances", { error, address, adapterId });
      return serverError("Failed to update balances");
    } finally {
      client.release(true);
    }
  };

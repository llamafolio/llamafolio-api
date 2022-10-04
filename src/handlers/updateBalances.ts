import { APIGatewayProxyHandler } from "aws-lambda";
import format from "pg-format";
import { strToBuf, isHex } from "@lib/buf";
import pool from "@db/pool";
import { BaseContext, Contract } from "@lib/adapter";
import { getPricedBalances } from "@lib/price";
import { adapterById } from "@adapters/index";
import { badRequest, serverError, success } from "@handlers/response";
import { insertBalances } from "@db/balances";
import {
  getAllContractsInteractions,
  getAllTokensInteractions,
} from "@db/contracts";
import { isNotNullish } from "@lib/type";
import type { AdapterBalancesResponse } from "@handlers/getBalances";
import { apiGatewayManagementApi } from "@handlers/apiGateway";

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

  const ctx: BaseContext = { address };

  console.log("Update balances of address", ctx.address);

  const client = await pool.connect();

  try {
    // Early return if balances last update was < 1 minute ago
    const balancesRes = await client.query(
      `select timestamp from balances where from_address = $1::bytea order by timestamp desc limit 1;`,
      [strToBuf(address)]
    );

    if (balancesRes.rows.length === 1) {
      const lastUpdatedAt = new Date(balancesRes.rows[0].timestamp).getTime();
      const now = new Date().getTime();
      // 1 minute delay
      if (now - lastUpdatedAt < 1 * 60 * 1000) {
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

    // Fetch all protocols (with their associated contracts) that the user interacted with
    // and all unique tokens he received
    const [contracts, tokens] = await Promise.all([
      getAllContractsInteractions(client, ctx.address),
      getAllTokensInteractions(client, ctx.address),
    ]);

    const contractsByAdapterId: { [key: string]: Contract[] } = {};
    for (const contract of contracts) {
      if (!contract.adapterId) {
        console.error(`Missing adapterId in contract`, contract);
        continue;
      }
      if (!contractsByAdapterId[contract.adapterId]) {
        contractsByAdapterId[contract.adapterId] = [];
      }
      contractsByAdapterId[contract.adapterId].push(contract);
    }
    contractsByAdapterId["wallet"] = tokens;

    console.log(
      "Interacted with protocols:",
      Object.keys(contractsByAdapterId)
    );

    // Run adapters `getBalances` only with the contracts the user interacted with
    const adaptersBalances = await Promise.all(
      Object.keys(contractsByAdapterId)
        .map(async (adapterId) => {
          try {
            const adapter = adapterById[adapterId];
            if (!adapter) {
              console.error(`Could not find adapter with id`, adapterId);
              return null;
            }

            const balancesConfig = await adapter.getBalances(
              ctx,
              contractsByAdapterId[adapterId] || []
            );

            // Tag balances with adapterId
            for (const balance of balancesConfig.balances) {
              balance.adapterId = adapterId;
            }

            return balancesConfig.balances;
          } catch (error) {
            console.error(`[${adapterId}]: Failed to getBalances`, error);
            return null;
          }
        })
        .filter(isNotNullish)
    );

    // Ungroup balances to make only 1 call to the price API
    const balances = adaptersBalances.flat().filter(isNotNullish);

    // Filter out balances with invalid amounts
    const sanitizedBalances = balances.filter((balance) => {
      if (!balance.amount) {
        console.error(`Missing balance amount`, balance);
        return false;
      }

      if (balance.underlyings) {
        for (const underlying of balance.underlyings) {
          if (!underlying.amount) {
            console.error(`Missing underlying balance amount`, balance);
            return false;
          }
        }
      }

      if (balance.rewards) {
        for (const reward of balance.rewards) {
          if (!reward.amount) {
            console.error(`Missing reward balance amount`, balance);
            return false;
          }
        }
      }

      return true;
    });

    const pricedBalances = await getPricedBalances(sanitizedBalances);

    console.log("Found balances:", pricedBalances);

    // Group balances back by adapter
    const pricedBalancesByAdapterId: { [key: string]: any[] } = {};
    for (const pricedBalance of pricedBalances) {
      if (!pricedBalancesByAdapterId[pricedBalance.adapterId]) {
        pricedBalancesByAdapterId[pricedBalance.adapterId] = [];
      }
      pricedBalancesByAdapterId[pricedBalance.adapterId].push(pricedBalance);
    }

    const now = new Date();

    // Update balances
    await client.query("BEGIN");

    // Delete old balances
    await client.query(
      format(
        "delete from balances where from_address = %L::bytea",
        strToBuf(address)
      ),
      []
    );

    // Insert new balances
    await Promise.all(
      Object.keys(pricedBalancesByAdapterId).map((adapterId) =>
        insertBalances(
          client,
          pricedBalancesByAdapterId[adapterId],
          adapterId,
          address,
          now
        )
      )
    );

    await client.query("COMMIT");

    const data: AdapterBalancesResponse[] = Object.keys(
      pricedBalancesByAdapterId
    ).map((adapterId) => ({
      id: adapterId,
      data: pricedBalancesByAdapterId[adapterId],
    }));

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
    console.error("Failed to update balances", { error, address });
    return serverError("Failed to update balances");
  } finally {
    client.release(true);
  }
};

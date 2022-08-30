import { ApiGatewayManagementApi } from "aws-sdk";
import format from "pg-format";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import {
  Balance,
  BaseContext,
  Contract,
  PricedBalance,
  Adapter,
} from "@lib/adapter";
import { getPricedBalances } from "@lib/price";
import { adapters, adapterById } from "@adapters/index";
import { isNotNullish } from "@lib/type";
import { badRequest, serverError, success } from "./response";

type AdapterBalance = Balance & { adapterId: string };
type PricedAdapterBalance = PricedBalance & { adapterId: string };

type AdapterBalancesResponse = Pick<
  Adapter,
  "id" | "name" | "description" | "coingecko" | "defillama" | "links"
> & {
  data: (AdapterBalance | PricedAdapterBalance)[];
};

async function getAdaptersBalances(ctx, client, contracts: [string, Buffer][]) {
  if (contracts.length === 0) {
    return [];
  }

  // TODO: investigate joining this with `distinct_transactions_to`
  const adaptersContractsRes = await client.query(
    format(
      "select adapter_id, chain, address, data from (values %L) AS lookup(key, val) join adapters_contracts c on c.chain = key::varchar and c.address = val::bytea;",
      contracts
    ),
    []
  );

  const contractsByAdapterId: { [key: string]: Contract[] } = {};

  for (const row of adaptersContractsRes.rows) {
    if (!contractsByAdapterId[row.adapter_id]) {
      contractsByAdapterId[row.adapter_id] = [];
    }
    contractsByAdapterId[row.adapter_id].push({
      chain: row.chain,
      address: bufToStr(row.address),
    });
  }

  const adapterIds = Object.keys(contractsByAdapterId);
  const _adapters = adapterIds
    .map((id) => adapterById[id])
    .filter(isNotNullish);

  const adaptersBalances: AdapterBalance[] = (
    await Promise.all(
      _adapters.map((adapter) =>
        adapter.getBalances(ctx, contractsByAdapterId[adapter.id])
      )
    )
  )
    .map((config, i) =>
      config.balances.map((balance) => ({
        ...balance,
        adapterId: _adapters[i].id,
      }))
    )
    .flat();

  return adaptersBalances;
}

async function getAllAdaptersBalances(ctx, client) {
  const adaptersContractsRes = await client.query(
    "select * from adapters_contracts;",
    []
  );

  const contractsByAdapterId: { [key: string]: Contract[] } = {};

  for (const row of adaptersContractsRes.rows) {
    if (!contractsByAdapterId[row.adapter_id]) {
      contractsByAdapterId[row.adapter_id] = [];
    }
    contractsByAdapterId[row.adapter_id].push({
      chain: row.chain,
      address: bufToStr(row.address),
      ...row.data,
    });
  }

  const adaptersBalances: AdapterBalance[] = (
    await Promise.all(
      adapters.map((adapter) =>
        adapter.getBalances(ctx, contractsByAdapterId[adapter.id])
      )
    )
  )
    .map((config, i) =>
      config.balances.map((balance) => ({
        ...balance,
        adapterId: adapters[i].id,
      }))
    )
    .flat();

  return adaptersBalances;
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
        balanceUSD: parseFloat(d.balance_usd),
        timestamp: d.timestamp,
        reward: d.reward,
        debt: d.debt,
        stable: d.stable,
        parent: d.parent ? bufToStr(d.parent) : undefined,
        claimable: d.claimable,
      }));

    // group balances by adapter
    const balancesByAdapterId: {
      [key: string]: AdapterBalancesResponse;
    } = {};
    for (const balance of pricedBalances) {
      if (!balancesByAdapterId[balance.adapterId]) {
        balancesByAdapterId[balance.adapterId] = {
          ...adapterById[balance.adapterId],
          data: [],
        };
      }
      balancesByAdapterId[balance.adapterId].data.push(balance);
    }

    const data = Object.values(balancesByAdapterId);
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

export async function websocketUpdateHandler(event, context) {
  // https://github.com/brianc/node-postgres/issues/930#issuecomment-230362178
  context.callbackWaitsForEmptyEventLoop = false; // !important to reuse pool

  const { connectionId, address } = event;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const ctx: BaseContext = { address };

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
    // const adaptersBalances = await getAdaptersBalances(ctx, client, contracts);
    const adaptersBalances = await getAllAdaptersBalances(ctx, client);

    // TODO: optimization when chains are synced: only run the wallet adapter with received tokens, not the full list
    // const tokensByChain: { [key: string]: string[] } = {};
    // for (const row of tokensRes.rows) {
    //   const chain = row.chain;
    //   const address = bufToStr(row.token_address);
    //   if (!tokensByChain[chain]) {
    //     tokensByChain[chain] = [];
    //   }
    //   tokensByChain[chain].push(address);
    // }

    // const chains = Object.keys(tokensByChain);
    // const erc20ChainsBalances = await Promise.all(
    //   chains.map((chain) => getERC20Balances(ctx, chain, tokensByChain[chain]))
    // );
    // const erc20Balances: AdapterBalance[] = erc20ChainsBalances.flatMap(
    //   (balances) =>
    //     balances.map((balance) => ({
    //       ...balance,
    //       category: "wallet",
    //       adapterId: "wallet",
    //     }))
    // );

    const balances = adaptersBalances;
    // .concat(erc20Balances);

    const pricedBalances = await getPricedBalances(balances);

    const now = new Date();

    // insert balances
    const insertBalancesValues = pricedBalances.map((d) => [
      strToBuf(address),
      d.chain,
      strToBuf(d.address),
      d.symbol,
      d.decimals,
      d.amount.toString(),
      d.category,
      d.adapterId,
      (d as PricedBalance).price,
      (d as PricedBalance).timestamp
        ? new Date((d as PricedBalance).timestamp)
        : undefined,
      (d as PricedBalance).balanceUSD,
      now,
      d.reward,
      d.debt,
      d.stable,
      d.parent ? strToBuf(d.parent) : undefined,
      d.claimable?.toString(),
    ]);

    await client.query(
      format(
        "INSERT INTO balances (from_address, chain, address, symbol, decimals, amount, category, adapter_id, price, price_timestamp, balance_usd, timestamp, reward, debt, stable, parent, claimable) VALUES %L;",
        insertBalancesValues
      ),
      []
    );

    // group balances by adapter
    const balancesByAdapterId: {
      [key: string]: AdapterBalancesResponse;
    } = {};
    for (const balance of pricedBalances) {
      if (!balancesByAdapterId[balance.adapterId]) {
        balancesByAdapterId[balance.adapterId] = {
          ...adapterById[balance.adapterId],
          data: [],
        };
      }
      balancesByAdapterId[balance.adapterId].data.push(balance);
    }

    const data = Object.values(balancesByAdapterId);

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

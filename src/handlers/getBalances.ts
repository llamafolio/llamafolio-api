import { BigNumber } from "ethers";
import { ApiGatewayManagementApi } from "aws-sdk";
import format from "pg-format";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import { getERC20Balances } from "@lib/erc20";
import {
  Balance,
  BaseContext,
  Contract,
  PricedBalance,
  CategoryBalances,
  Adapter,
} from "@lib/adapter";
import { getERC20Prices } from "@lib/price";
import { adapterById } from "@adapters/index";
import { isNotNullish } from "@lib/type";
import { badRequest, serverError, success } from "./response";
import { mulPrice, sum } from "@lib/math";

type AdapterBalance = Balance & { adapterId: string };
type PricedAdapterBalance = PricedBalance & { adapterId: string };

type AdapterBalancesResponse = Pick<
  Adapter,
  "id" | "name" | "description" | "coingecko" | "defillama" | "links"
> & {
  categories: any[];
  totalUSD: number;
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
  const adapters = adapterIds.map((id) => adapterById[id]).filter(isNotNullish);

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
      }));

    // group balances by adapter
    const balancesByAdapterId: {
      [key: string]: (AdapterBalance | PricedAdapterBalance)[];
    } = {};
    for (const balance of pricedBalances) {
      if (!balancesByAdapterId[balance.adapterId]) {
        balancesByAdapterId[balance.adapterId] = [];
      }
      balancesByAdapterId[balance.adapterId].push(balance);
    }

    const data: AdapterBalancesResponse[] = [];

    for (const adapterId in balancesByAdapterId) {
      const adapter: AdapterBalancesResponse = {
        ...adapterById[adapterId],
        totalUSD: 0,
        categories: [],
      };

      // group by category
      const balancesByCategory: Record<
        string,
        (AdapterBalance | PricedAdapterBalance)[]
      > = {};
      for (const balance of balancesByAdapterId[adapterId]) {
        if (!balancesByCategory[balance.category]) {
          balancesByCategory[balance.category] = [];
        }
        balancesByCategory[balance.category].push(balance);
      }

      const categoriesBalances: CategoryBalances[] = [];
      for (const category in balancesByCategory) {
        const cat: CategoryBalances = {
          title: category,
          totalUSD: 0,
          balances: [],
        };

        for (const balance of balancesByCategory[category]) {
          cat.totalUSD += balance.balanceUSD || 0;
          cat.balances.push(balance);
        }

        // sort by balanceUSD
        cat.balances.sort((a, b) => {
          if (a.balanceUSD != null && b.balanceUSD == null) {
            return -1;
          }
          if (a.balanceUSD == null && b.balanceUSD != null) {
            return 1;
          }
          return b.balanceUSD - a.balanceUSD;
        });

        categoriesBalances.push(cat);
      }

      // sort categories by total balances
      categoriesBalances.sort((a, b) => b.totalUSD - a.totalUSD);

      adapter.categories = categoriesBalances;
      adapter.totalUSD = sum(adapter.categories.map((b) => b.totalUSD));
      data.push(adapter);
    }

    // sort adapters
    data.sort((a, b) => b.totalUSD - a.totalUSD);

    return success({ totalUSD: sum(data.map((d) => d.totalUSD)), data });
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

  const now = new Date();

  const client = await pool.connect();

  try {
    const [tokensRes, contractsRes] = await Promise.all([
      // TODO: filter ERC20 tokens only
      client.query(
        `select * from all_distinct_tokens_received($1::bytea) limit 500;`,
        [strToBuf(address)]
      ),
      // client.query(`select * from all_contract_interactions($1::bytea);`, [
      //   strToBuf(address),
      // ]),
      client.query(`select * from distinct_transactions_to($1::bytea);`, [
        strToBuf(address),
      ]),
    ]);

    const contracts = contractsRes.rows.map((row) => [
      row.chain,
      row.to_address,
    ]);

    const adaptersBalances = await getAdaptersBalances(ctx, client, contracts);

    const tokensByChain: { [key: string]: string[] } = {};
    for (const row of tokensRes.rows) {
      const chain = row.chain;
      const address = bufToStr(row.token_address);
      if (!tokensByChain[chain]) {
        tokensByChain[chain] = [];
      }
      tokensByChain[chain].push(address);
    }

    const chains = Object.keys(tokensByChain);
    const erc20ChainsBalances = await Promise.all(
      chains.map((chain) => getERC20Balances(ctx, chain, tokensByChain[chain]))
    );
    const erc20Balances: AdapterBalance[] = erc20ChainsBalances.flatMap(
      (balances) =>
        balances.map((balance) => ({
          ...balance,
          category: "wallet",
          adapterId: "wallet",
        }))
    );

    const balances = adaptersBalances
      .concat(erc20Balances)
      .filter((balance) => balance.amount.gt(0));

    const prices = await getERC20Prices(balances);

    const pricedBalances: (AdapterBalance | PricedAdapterBalance)[] =
      balances.map((balance) => {
        const key = `${balance.chain}:${balance.address}`;
        const price = prices.coins[key];
        if (price !== undefined) {
          try {
            return {
              ...balance,
              decimals: price.decimals,
              price: price.price,
              // 6 decimals precision
              balanceUSD: mulPrice(
                balance.amount,
                price.decimals,
                price.price,
                6
              ),
              symbol: price.symbol,
              timestamp: price.timestamp,
            };
          } catch (error) {
            console.log(
              `Failed to get balanceUSD for ${balance.chain}:${balance.address}`,
              error
            );
            return balance;
          }
        } else {
          // TODO: Mising price and token info from Defillama API
          console.log(
            `Failed to get price on Defillama API for ${balance.chain}:${balance.address}`
          );
        }
        return balance;
      });

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
    ]);

    await client.query(
      format(
        "INSERT INTO balances (from_address, chain, address, symbol, decimals, amount, category, adapter_id, price, price_timestamp, balance_usd, timestamp) VALUES %L;",
        insertBalancesValues
      ),
      []
    );

    // group balances by adapter
    const balancesByAdapterId: {
      [key: string]: (AdapterBalance | PricedAdapterBalance)[];
    } = {};
    for (const balance of pricedBalances) {
      if (!balancesByAdapterId[balance.adapterId]) {
        balancesByAdapterId[balance.adapterId] = [];
      }
      balancesByAdapterId[balance.adapterId].push(balance);
    }

    const data: AdapterBalancesResponse[] = [];

    for (const adapterId in balancesByAdapterId) {
      const adapter: AdapterBalancesResponse = {
        ...adapterById[adapterId],
        totalUSD: 0,
        categories: [],
      };

      // group by category
      const balancesByCategory: Record<
        string,
        (AdapterBalance | PricedAdapterBalance)[]
      > = {};
      for (const balance of balancesByAdapterId[adapterId]) {
        if (!balancesByCategory[balance.category]) {
          balancesByCategory[balance.category] = [];
        }
        balancesByCategory[balance.category].push(balance);
      }

      const categoriesBalances: CategoryBalances[] = [];
      for (const category in balancesByCategory) {
        const cat: CategoryBalances = {
          title: category,
          totalUSD: 0,
          balances: [],
        };

        for (const balance of balancesByCategory[category]) {
          cat.totalUSD += balance.balanceUSD || 0;
          cat.balances.push(balance);
        }

        // sort by balanceUSD
        cat.balances.sort((a, b) => {
          if (a.balanceUSD != null && b.balanceUSD == null) {
            return -1;
          }
          if (a.balanceUSD == null && b.balanceUSD != null) {
            return 1;
          }
          return b.balanceUSD - a.balanceUSD;
        });

        categoriesBalances.push(cat);
      }

      // sort categories by total balances
      categoriesBalances.sort((a, b) => b.totalUSD - a.totalUSD);

      adapter.categories = categoriesBalances;
      adapter.totalUSD = sum(adapter.categories.map((b) => b.totalUSD));
      data.push(adapter);
    }

    // sort adapters
    data.sort((a, b) => b.totalUSD - a.totalUSD);

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          event: "updateBalances",
          data: { totalUSD: sum(data.map((d) => d.totalUSD)), data },
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

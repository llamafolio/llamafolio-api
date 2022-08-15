import { ApiGatewayManagementApi } from "aws-sdk";
import format from "pg-format";
import { strToBuf, bufToStr, isHex } from "@lib/buf";
import pool from "@db/pool";
import { getERC20Balances } from "@lib/erc20";
import { Balance, BaseContext, Contract, PricedBalance } from "@lib/adapter";
import { getERC20Prices } from "@lib/price";
import { adapterById } from "@adapters/index";
import { isNotNullish } from "@lib/type";
import { toJSON } from "@lib/balance";
import { badRequest, serverError, success } from "./response";

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

  const adaptersBalances = (
    await Promise.all(
      adapters.map((adapter) =>
        adapter.getBalances(ctx, contractsByAdapterId[adapter.id])
      )
    )
  )
    .map((config) => config.balances)
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

  const ctx: BaseContext = { address };

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
    const erc20Balances: Balance[] = erc20ChainsBalances.flatMap((balances) =>
      balances.map((balance) => ({
        ...balance,
        category: "wallet",
      }))
    );

    const balances = adaptersBalances
      .concat(erc20Balances)
      .filter((balance) => balance.amount.gt(0));

    const prices = await getERC20Prices(balances);

    const pricedBalances: (Balance | PricedBalance)[] = balances.map(
      (balance) => {
        const key = `${balance.chain}:${balance.address}`;
        const price = prices.coins[key];
        if (price !== undefined) {
          try {
            const balanceAmount = balance.amount
              .div(10 ** price.decimals)
              .toNumber();

            return {
              ...balance,
              decimals: price.decimals,
              price: price.price,
              balanceUSD: balanceAmount * price.price,
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
      }
    );

    // TODO: group tokens per adapter and category and sort them by price

    return success({ data: pricedBalances.map(toJSON) });
  } catch (e) {
    return serverError("Failed to retrieve balances");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

export async function websocketHandler(event, context) {
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
    const erc20Balances: Balance[] = erc20ChainsBalances.flatMap((balances) =>
      balances.map((balance) => ({
        ...balance,
        category: "wallet",
      }))
    );

    const balances = adaptersBalances
      .concat(erc20Balances)
      .filter((balance) => balance.amount.gt(0));

    const prices = await getERC20Prices(balances);

    const pricedBalances: (Balance | PricedBalance)[] = balances.map(
      (balance) => {
        const key = `${balance.chain}:${balance.address}`;
        const price = prices.coins[key];
        if (price !== undefined) {
          try {
            const balanceAmount = balance.amount
              .div(10 ** price.decimals)
              .toNumber();

            return {
              ...balance,
              decimals: price.decimals,
              price: price.price,
              balanceUSD: balanceAmount * price.price,
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
      }
    );

    // TODO: group tokens per adapter and category and sort them by price

    const apiGatewayManagementApi = new ApiGatewayManagementApi({
      endpoint: process.env.APIG_ENDPOINT,
    });

    await apiGatewayManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          data: pricedBalances.map(toJSON),
        }),
      })
      .promise();

    return success({});
  } catch (e) {
    return serverError("Failed to retrieve balances");
  } finally {
    // https://github.com/brianc/node-postgres/issues/1180#issuecomment-270589769
    client.release(true);
  }
}

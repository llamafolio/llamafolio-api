import fetch from "node-fetch";
import { strToBuf, bufToStr } from "@lib/buf";
import pool from "@db/pool";
import { getERC20Balances } from "@lib/erc20";
import { toDefiLlama } from "@lib/chain";
import {
  getAdapters,
  Balance,
  BaseContext,
  PricedBalance,
  BaseContract,
} from "@lib/adapter";

export async function handler(event, context) {
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

    const contracts: BaseContract[] = contractsRes.rows.map((row) => ({
      chain: row.chain,
      address: bufToStr(row.to_address),
    }));

    const adapters = await getAdapters(contracts);

    const adaptersBalances = (
      await Promise.all(
        adapters.map((adapter) => adapter.getBalances(ctx, contracts))
      )
    )
      .map((config) => config.balances)
      .flat();

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

    const pricesRes = await fetch("https://coins.llama.fi/prices", {
      method: "POST",
      body: JSON.stringify({
        coins: balances.map(
          (balance) => `${toDefiLlama(balance.chain)}:${balance.address}`
        ),
      }),
    });
    const prices = await pricesRes.json();

    const pricedBalances: (Balance | PricedBalance)[] = balances.map(
      (balance) => {
        const key = `${balance.chain}:${balance.address}`;
        const price = prices.coins[key];
        if (price !== undefined) {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: pricedBalances,
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
}

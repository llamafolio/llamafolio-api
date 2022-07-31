import fetch from "node-fetch";
import BigNumber from "bignumber.js";
import { multiCall } from "@defillama/sdk/build/abi/index";
import { Interface } from "ethers/lib/utils";
import { strToBuf, bufToStr } from "../lib/buf";
import pool from "../db/pool";
import { getERC20Fetcher } from "../lib/erc20";
import { contractRegistry } from "../adapters";
import { toDefiLlama } from "../lib/chain";

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

  const ctx: { [key: string]: any } = { account: address };

  const client = await pool.connect();

  try {
    const [tokensRes, contractsRes] = await Promise.all([
      // TODO: filter ERC20 tokens only
      client.query(
        `select * from all_distinct_tokens_received($1::bytea) limit 500;`,
        [strToBuf(address)]
      ),
      client.query(`select * from all_contract_interactions($1::bytea);`, [
        strToBuf(address),
      ]),
    ]);

    const fetchers = [];

    for (const row of contractsRes.rows) {
      const key = `${row.chain}:${bufToStr(row.contract_address)}`;
      if (contractRegistry[key]) {
        const fetcher = contractRegistry[key];
        fetcher.__context = { account: address, calls: [] };
        fetchers.push(fetcher);
      }
    }

    for (const row of tokensRes.rows) {
      const chain = row.chain;
      const token = bufToStr(row.token_address);
      const key = `${chain}:${token}`;
      // if no adapter specifies a fetcher for this token, fallback to ERC20 for token_transfers
      if (!contractRegistry[key]) {
        const fetcher = getERC20Fetcher(chain, token);
        fetcher.__context = { account: address, calls: [] };
        fetchers.push(fetcher);
      }
    }

    // add "statically" (non async) defined multicalls responses to context
    const multicallsBySig: { [key: string]: object } = {};

    // join fetcher calls into multicalls
    for (const fetcher of fetchers) {
      const calls = fetcher.getCalls?.(ctx) || [];
      if (calls.length === 0) {
        continue;
      }

      for (const call of calls) {
        const iface = new Interface([call.abi]);
        const sighash = iface.getSighash(iface.fragments[0]);
        const key = `${call.chain}:${sighash}`;
        if (!multicallsBySig[key]) {
          multicallsBySig[key] = {
            chain: call.chain,
            calls: [],
            abi: call.abi,
          };
        }
        // @ts-ignore
        multicallsBySig[key].calls.push({
          target: call.target,
          params: call.params,
          fetcher,
        });
      }
    }

    const multicalls = Object.values(multicallsBySig);

    // run multicalls
    const multicallsRes = await Promise.all(
      multicalls.map((props: any) =>
        // ignore individual errors
        multiCall(props).catch((err) => {
          console.error(
            `Multicall ${props.abi} on chain ${props.chain} failed: ${err}`
          );
          return null;
        })
      )
    );

    // map multicall outputs back to their fetchers
    for (let i = 0; i < multicallsRes.length; i++) {
      const multicall = multicalls[i];

      if (multicallsRes[i]?.output) {
        for (let j = 0; j < multicallsRes[i]!.output.length; j++) {
          const fetcher = multicall.calls[j].fetcher;
          if (!fetcher.__context) {
            fetcher.__context = { account: address, calls: [] };
          }
          fetcher.__context.calls.push(multicallsRes[i]!.output[j]);
        }
      }
    }

    const fetchersBalances = await Promise.all(
      fetchers.map(
        (fetcher) =>
          fetcher.getBalances?.(fetcher.__context) ?? Promise.resolve(null)
      )
    );

    const nonEmptyFetchers = fetchersBalances
      .map((balances) =>
        balances.flatMap((balance) => {
          balance.amountBN = new BigNumber(balance.balance);
          if (balance.amountBN.gt(0)) {
            return balance;
          }
          return [];
        })
      )
      .filter((balances) => balances.length > 0);

    const coins = [];
    for (const balances of nonEmptyFetchers) {
      for (const balance of balances) {
        balance.amountBN = new BigNumber(balance.balance);
        if (balance.amountBN.gt(0)) {
          coins.push(`${toDefiLlama(balance.chain)}:${balance.address}`);
        }
      }
    }

    const pricesRes = await fetch("https://coins.llama.fi/prices", {
      method: "POST",
      body: JSON.stringify({ coins }),
    });
    const prices = await pricesRes.json();

    for (const balances of nonEmptyFetchers) {
      for (const balance of balances) {
        const key = `${balance.chain}:${balance.address}`;
        const price = prices.coins[key];
        if (price !== undefined) {
          const balanceAmount = balance.amountBN
            .div(10 ** price.decimals)
            .toNumber();

          balance.decimals = price.decimals;
          balance.price = price.price;
          balance.balanceUSD = balanceAmount * price.price;
          balance.symbol = price.symbol;
          balance.timestamp = price.timestamp;
        } else {
          // TODO: Mising price and token info from Defillama API
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: nonEmptyFetchers,
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

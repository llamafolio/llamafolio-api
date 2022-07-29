import BigNumber from "bignumber.js";
import type { Token } from "../token";
import { multiCall } from "@defillama/sdk/build/abi/index";
import fetch from "node-fetch";
import { Multicall } from "./multicall";
import { toDefiLlama } from "./chain";

class ERC20Multicall extends Multicall {
  abis = {};

  constructor() {
    super();
    this.abis["balanceOf"] = {
      constant: true,
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    };

    // this.addAbi([
    //   {
    //     constant: true,
    //     inputs: [{ internalType: "address", name: "", type: "address" }],
    //     name: "balanceOf",
    //     outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    //     payable: false,
    //     stateMutability: "view",
    //     type: "function",
    //   },
    // ]);
    // this.addAbi(["function balanceOf(address) view returns (uint256)"]);
  }

  balanceOf(chain, tokenAddress, accountAddress) {
    this.addCall(chain, "function balanceOf(address) view returns (uint256)", {
      target: tokenAddress,
      params: [accountAddress],
    });
  }

  execute(abiKey) {}
}

// TODO: manage large multicall: make a class to accumulate and split into chunks if necessary
export async function getBalances(tokens: Token[], account: string) {
  const tokensByChain: any = {};
  for (const token of tokens) {
    if (tokensByChain[token.chain] === undefined) {
      tokensByChain[token.chain] = [];
    }
    tokensByChain[token.chain].push(token);
  }

  const chains = Object.keys(tokensByChain);

  const chainBalances = await Promise.all(
    chains.map(async (chain) => {
      try {
        const res = await multiCall({
          chain,
          calls: tokensByChain[chain].map((token) => ({
            target: token.address,
            params: [account],
          })),
          abi: {
            constant: true,
            inputs: [{ internalType: "address", name: "", type: "address" }],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            payable: false,
            stateMutability: "view",
            type: "function",
          },
        });

        return res;
      } catch (error) {
        return null;
      }
    })
  );

  const balances = [];
  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];

    if (chainBalances[i]?.output) {
      for (let j = 0; j < chainBalances[i].output.length; j++) {
        const balanceRes = chainBalances[i].output[j];

        if (balanceRes.success && balanceRes.output !== "0") {
          balances.push({
            ...tokensByChain[chain][j],
            balance: balanceRes.output,
          });
        }
      }
    }
  }

  const pricesRes = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: balances.map(
        (balance) => `${toDefiLlama(balance.chain)}:${balance.address}`
      ),
    }),
  });
  const prices = await pricesRes.json();

  // merge
  return balances.map((balance) => {
    const key = `${balance.chain}:${balance.address}`;
    const price = prices.coins[key];
    if (price !== undefined) {
      const balanceAmount = new BigNumber(balance.balance)
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

    return balance;
  });
}

const erc20Multicall = new ERC20Multicall();

import fetch from "node-fetch";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";
import { Balance, PricedBalance } from "@lib/adapter";
import { mulPrice } from "@lib/math";

// Defillama prices API requires a prefix to know where the token comes from.
// It can be a chain or a market provider like coingecko
function getTokenKey(token: Token) {
  if (token.coingeckoId) {
    return `coingecko:${token.coingeckoId}`;
  }

  if (token.chain && token.priceSubstitute) {
    return `${token.chain}:${token.priceSubstitute.toLowerCase()}`;
  }

  if (token.chain && token.address) {
    return `${token.chain}:${token.address.toLowerCase()}`;
  }
}

type PricesResponse = {
  coins: {
    [key: string]: {
      price: number;
      symbol: string;
      decimals?: number;
      timestamp: number;
    };
  };
};

export async function getTokenPrices(tokens: Token[]): Promise<PricesResponse> {
  const pricesRes = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: tokens.map(getTokenKey).filter(isNotNullish),
    }),
  });
  return pricesRes.json();
}

export async function getPricedBalances(
  balances: Balance[]
): Promise<(Balance | PricedBalance)[]> {
  // Filter empty balances
  balances = balances.filter(
    (balance) =>
      balance.amount.gt(0) ||
      balance.rewards?.some((reward) => reward.amount.gt(0))
  );

  const balanceByKey: { [key: string]: Balance } = {};
  for (const balance of balances) {
    const key = getTokenKey(balance);
    if (key) {
      balanceByKey[key] = balance;
    }
  }

  const prices = await getTokenPrices(balances);

  const pricedBalances: (Balance | PricedBalance)[] = balances.map(
    (balance) => {
      const key = getTokenKey(balance);
      if (!key) {
        console.log("Failed to get price token key for balance", balance);
        return balance;
      }

      const price = prices.coins[key];
      if (price !== undefined) {
        try {
          return {
            ...price,
            ...balance,
            balanceUSD: mulPrice(
              balance.amount,
              price.decimals || balance.decimals,
              price.price
            ),
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
        console.log(`Failed to get price on Defillama API for ${key}`);
      }

      return balance;
    }
  );

  return pricedBalances;
}

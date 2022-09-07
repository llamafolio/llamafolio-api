import fetch from "node-fetch";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";
import {
  BaseBalance,
  Balance,
  PricedBalance,
  RewardBalance,
} from "@lib/adapter";
import { BN_ZERO, mulPrice, sum } from "@lib/math";

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
  // Collect underlyings and filter empty balances
  const priced: BaseBalance[] = [];
  for (const balance of balances) {
    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        if (underlying.amount.gt(0)) {
          priced.push(underlying);
        }
      }
    } else {
      if (balance.amount.gt(0) || (balance as RewardBalance).claimable?.gt(0)) {
        priced.push(balance);
      }
    }
  }

  const prices = await getTokenPrices(priced);

  function getPricedBalance(balance: BaseBalance) {
    const key = getTokenKey(balance);
    if (!key) {
      console.log("Failed to get price token key for balance", balance);
      return balance;
    }

    const price = prices.coins[key];
    if (price === undefined) {
      console.log(`Failed to get price on Defillama API for ${key}`);
      return balance;
    }

    const decimals = balance.decimals || price.decimals;
    if (decimals === undefined) {
      console.log(`Failed to get decimals for ${key}`);
      return balance;
    }

    return {
      ...price,
      ...balance,
      balanceUSD: mulPrice(balance.amount, decimals, price.price),
      claimableUSD: mulPrice(
        (balance as RewardBalance).claimable || BN_ZERO,
        decimals,
        price.price
      ),
    };
  }

  const pricedBalances: (Balance | PricedBalance)[] = balances.map(
    (balance) => {
      if (balance.underlyings) {
        const pricedUnderlyings = balance.underlyings.map(getPricedBalance);
        return {
          ...balance,
          balanceUSD: sum(pricedUnderlyings.map((b) => b.balanceUSD || 0)),
          underlyings: pricedUnderlyings,
        };
      } else {
        return getPricedBalance(balance);
      }
    }
  );

  return pricedBalances;
}

import fetch from "node-fetch";
import { Token } from "@lib/token";

export async function getERC20Prices(tokens: Token[]) {
  const pricesRes = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: tokens.map(
        (token) => `${token.chain}:${(token.priceSubstitute)?token.priceSubstitute.toLowerCase():token.address.toLowerCase()}`
      ),
    }),
  });
  return pricesRes.json();
}

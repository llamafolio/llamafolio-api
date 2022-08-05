import fetch from "node-fetch";
import { Token } from "@lib/token";
import { toDefiLlama } from "@lib/chain";

export async function getERC20Prices(tokens: Token[]) {
  const pricesRes = await fetch("https://coins.llama.fi/prices", {
    method: "POST",
    body: JSON.stringify({
      coins: tokens.map(
        (token) => `${toDefiLlama(token.chain)}:${token.address.toLowerCase()}`
      ),
    }),
  });
  return pricesRes.json();
}

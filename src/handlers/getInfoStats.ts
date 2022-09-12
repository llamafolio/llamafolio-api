import { success } from "@handlers/response";
import { adapters } from "@adapters/index";
import { chains } from "@lib/chain";
import { sum } from "@lib/math";
import { Token } from "@lib/token";
import { chains as tokensByChain } from "@llamafolio/tokens";

/**
 * Get stats on supported protocols, chains and tokens
 */
export async function handler() {
  return success(
    {
      data: {
        protocols: adapters.length,
        chains: chains.length,
        tokens: sum(
          Object.values(tokensByChain).map(
            (tokens) => (tokens as Token[]).length
          )
        ),
      },
    },
    { maxAge: 10 * 60 }
  );
}

import { APIGatewayProxyHandler } from "aws-lambda";
import { success } from "@handlers/response";
import { adapters } from "@adapters/index";
import { sum } from "@lib/math";
import { chains as tokensByChain } from "@llamafolio/tokens";
import { chains } from "@lib/chains";

/**
 * Get stats on supported protocols, chains and tokens
 */
export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: {
        protocols: adapters.length,
        chains: chains.length,
        tokens: sum(
          Object.values(tokensByChain).map((tokens) => tokens.length)
        ),
      },
    },
    { maxAge: 10 * 60 }
  );
};

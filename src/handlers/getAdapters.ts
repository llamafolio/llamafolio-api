import { APIGatewayProxyHandler } from "aws-lambda";
import { success } from "@handlers/response";
import { adapters } from "@adapters/index";

export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: {
        adapters: adapters.map((adapter) => ({ id: adapter.id })),
      },
    },
    { maxAge: 10 * 60 }
  );
};

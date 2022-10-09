import { APIGatewayProxyHandler } from "aws-lambda";
import { Categories } from "@lib/category";
import { success } from "@handlers/response";

export const handler: APIGatewayProxyHandler = async () => {
  return success(
    {
      data: Object.values(Categories),
    },
    { maxAge: 10 * 60 }
  );
};

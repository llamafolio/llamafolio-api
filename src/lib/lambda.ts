import aws from "aws-sdk";
import { APIGatewayProxyHandler } from "aws-lambda";

type InvocationType = "RequestResponse" | "Event" | "DryRun";

export function invokeLambda(
  functioName: string,
  event: any,
  invocationType?: InvocationType
) {
  return new Promise((resolve, _reject) => {
    new aws.Lambda().invoke(
      {
        FunctionName: functioName,
        InvocationType: invocationType || "Event",
        Payload: JSON.stringify(event, null, 2), // pass params
      },
      function (error, data) {
        console.log(error, data);
        resolve(data);
      }
    );
  });
}

export function wrapScheduledLambda(
  lambdaFunc: APIGatewayProxyHandler
): APIGatewayProxyHandler {
  if (process.env.stage !== "prod") {
    return () => {
      console.log("This lambda is getting ignored, stage is not prod");
    };
  }
  return lambdaFunc;
}

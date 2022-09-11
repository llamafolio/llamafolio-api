import { APIGatewayProxyHandler } from "aws-lambda";
import { strToBuf, isHex } from "@lib/buf";
import pool from "@db/pool";
import { Balance, PricedBalance } from "@lib/adapter";
import { fromStorage } from "@db/balances";
import { badRequest, serverError, success } from "./response";

type AdapterBalance = Balance & { adapterId: string };
type PricedAdapterBalance = PricedBalance & { adapterId: string };

type AdapterBalancesResponse = {
  id: string;
  data: (AdapterBalance | PricedAdapterBalance)[];
};

// link underlyings with their parents
function groupBalanceUnderlyings(balances: PricedBalance[]) {
  const parents = balances.filter((balance) => balance.type !== "underlying");
  const underlyings = balances.filter(
    (balance) => balance.type === "underlying"
  );

  const parentByAddress: { [key: string]: string } = {};
  for (const parent of parents) {
    parentByAddress[parent.address] = parent;
  }

  for (const underlying of underlyings) {
    const parent = parentByAddress[underlying.parent];
    if (!parent) {
      continue;
    }
    if (!parent.underlyings) {
      parent.underlyings = [];
    }
    parent.underlyings.push(underlying);
  }

  return parents;
}

function groupBalancesByAdapter(
  balances: (AdapterBalance | PricedAdapterBalance)[]
) {
  const balancesByAdapterId: {
    [key: string]: AdapterBalancesResponse;
  } = {};
  for (const balance of balances) {
    if (!balancesByAdapterId[balance.adapterId]) {
      balancesByAdapterId[balance.adapterId] = {
        id: balance.adapterId,
        data: [],
      };
    }
    balancesByAdapterId[balance.adapterId].data.push(balance);
  }

  return Object.values(balancesByAdapterId);
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const address = event.pathParameters?.address;
  if (!address) {
    return badRequest("Missing address parameter");
  }
  if (!isHex(address)) {
    return badRequest("Invalid address parameter, expected hex");
  }

  const client = await pool.connect();

  try {
    const balancesRes = await client.query(
      `select * from balances where from_address = $1::bytea;`,
      [strToBuf(address)]
    );

    const pricedBalances: (AdapterBalance | PricedAdapterBalance)[] =
      fromStorage(balancesRes.rows);

    const data = groupBalancesByAdapter(
      groupBalanceUnderlyings(pricedBalances)
    );
    let updatedAt = data[0]?.data?.[0].timestamp;

    return success({ updatedAt, data });
  } catch (error) {
    console.error("Failed to retrieve balances", { error, address });
    return serverError("Failed to retrieve balances");
  } finally {
    client.release(true);
  }
};

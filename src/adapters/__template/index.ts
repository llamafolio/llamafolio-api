import {
  Adapter,
  Balance,
  BaseContext,
  Contract,
  GetBalancesHandler,
} from "@lib/adapter";
import { Chain } from "@lib/providers";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
): Promise<Balance[]> {
  return [];
}

// Example contract object
const contract: Contract = {
  name: "",
  displayName: "",
  chain: "ethereum",
  address: "0x3cf54f3a1969be9916dad548f3c084331c4450b5",
};

const getContracts = async () => {
  return {
    // All contracts `getBalances` will look at
    contracts: [contract],
    // Optional revalidate time (in seconds)
    // Contracts returned by this function are cached by default and can be updated by interval with this parameter
    // This is mostly used for Factory contracts, which allow to create an arbitrary number of contracts
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  // Any method to check all the contracts retrieved above
  // This function will be run each time a user queries his balances
  // As contracts info is filled in the above function, this only needs to get the current amount for each contract (+ underlyings and rewards)
  const balances = await getStakeBalances(ctx, "ethereum", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  // DefiLlama slug
  id: "",
  getContracts,
  getBalances,
};

export default adapter;

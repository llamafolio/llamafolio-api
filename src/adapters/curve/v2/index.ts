import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { Contract } from "@lib/adapter";
import { getPoolsContracts, getPoolsBalances } from "./pools";


const MetaRegistry: Contract = {
  chain: "ethereum",
  address: "0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC",
};

const getContracts = async () => {
  const pools = await getPoolsContracts("ethereum", MetaRegistry);

  return {
    contracts: { pools, MetaRegistry },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { pools, MetaRegistry }
) => {
  const balances = await getPoolsBalances(ctx, "ethereum", pools || [], MetaRegistry);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "curve",
  getContracts,
  getBalances,
};

export default adapter;

import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sLF: Contract = {
  name: "sLife",
  chain: "avax",
  address: "0x769F19A9A449E523fC1F1f7B73051B3bC3C52738",
  symbol: "sLF",
  decimals: 9,
};

const getContracts = async () => {
  return {
    contracts: { sLF },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sLF }
) => {
  const balances = await getStakeBalances(ctx, "avax", sLF || []);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "life-dao",
  getContracts,
  getBalances,
};

export default adapter;

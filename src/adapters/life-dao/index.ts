import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const LF: Contract = {
  name: "Life",
  chain: "avax",
  address: "0x5684a087C739A2e845F4AaAaBf4FBd261edc2bE8",
  symbol: "LF",
  decimals: 9,
};

const sLF: Contract = {
  name: "sLife",
  chain: "avax",
  address: "0x769F19A9A449E523fC1F1f7B73051B3bC3C52738",
  symbol: "sLF",
  decimals: 9,
  underlyings: [LF],
};

const getContracts = () => {
  return {
    contracts: { sLF },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sLF }
) => {
  const balances = await getStakeBalances(ctx, "avax", sLF);

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

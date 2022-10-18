import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getContractsFromUnderlyingsLendingPool } from "./pool";
import { getSuppliedBorrowedBalances } from "./balances";

const lendingPoolFTM: Contract = {
  name: "lendingpool FTM",
  chain: "fantom",
  address: "0x7220FFD5Dc173BA3717E47033a01d870f06E5284",
};

const getContracts = async () => {
  const poolsContracts = await getContractsFromUnderlyingsLendingPool(
    "fantom",
    lendingPoolFTM
  );

  return {
    contracts: poolsContracts,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const balances = await getSuppliedBorrowedBalances(ctx, "fantom", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "the-granary",
  getContracts,
  getBalances,
};

export default adapter;

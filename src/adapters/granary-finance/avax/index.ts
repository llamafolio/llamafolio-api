import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";

const lendingPool: Contract = {
  chain: "avax",
  address: "0xb702ce183b4e1faa574834715e5d4a6378d0eed3",
  name: "Lending Pool",
};

export const getContracts = async () => {
  const poolsAvax = await getLendingPoolContracts("avax", lendingPool);

  return {
    contracts: {
      poolsAvax,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsAvax }
) => {
  const [lendingPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, "avax", poolsAvax || []),
    getLendingPoolHealthFactor(ctx, "avax", lendingPool),
  ]);

  return {
    balances: lendingPoolBalances,
    avax: {
      healthFactor,
    },
  };
};

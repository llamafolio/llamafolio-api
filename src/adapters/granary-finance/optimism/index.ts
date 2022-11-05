import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";

const lendingPool: Contract = {
  chain: "optimism",
  address: "0x8fd4af47e4e63d1d2d45582c3286b4bd9bb95dfe",
  name: "Lending Pool",
};

export const getContracts = async () => {
  const poolsOptimism = await getLendingPoolContracts(
    "optimism",
    lendingPool.address
  );

  return {
    contracts: {
      poolsOptimism,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsOptimism }
) => {
  const [lendingPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, "optimism", poolsOptimism || [], lendingPool),
    getLendingPoolHealthFactor(ctx, "optimism", lendingPool),
  ]);

  return {
    balances: lendingPoolBalances,
    optimism: {
      healthFactor,
    },
  };
};

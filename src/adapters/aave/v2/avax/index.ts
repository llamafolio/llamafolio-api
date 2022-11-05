import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";
import { getLendingRewardsBalances } from "@adapters/aave/v2/common/rewards";

const lendingPool: Contract = {
  name: "Lending Pool",
  address: "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c",
  chain: "avax",
};

export const getContracts = async () => {
  const poolsAvax = await getLendingPoolContracts("avax", lendingPool.address);

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
  const [lendingPoolBalances, rewardsPoolBalances, healthFactor] =
    await Promise.all([
      getLendingPoolBalances(ctx, "avax", poolsAvax || [], lendingPool),
      getLendingRewardsBalances(ctx, "avax", poolsAvax || [], lendingPool),
      getLendingPoolHealthFactor(ctx, "avax", lendingPool),
    ]);

  return {
    balances: [...lendingPoolBalances, ...rewardsPoolBalances],
    avax: {
      healthFactor,
    },
  };
};

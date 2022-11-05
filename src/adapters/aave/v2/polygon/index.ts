import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";
import { getLendingRewardsBalances } from "@adapters/aave/v2/common/rewards";

const lendingPool: Contract = {
  name: "Lending Pool",
  address: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
  chain: "polygon",
};

export const getContracts = async () => {
  const poolsPolygon = await getLendingPoolContracts(
    "polygon",
    lendingPool.address
  );

  return {
    contracts: {
      poolsPolygon,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsPolygon }
) => {
  const [lendingPoolBalances, rewardsPoolBalances, healthFactor] =
    await Promise.all([
      getLendingPoolBalances(ctx, "polygon", poolsPolygon || [], lendingPool),
      getLendingRewardsBalances(
        ctx,
        "polygon",
        poolsPolygon || [],
        lendingPool
      ),
      getLendingPoolHealthFactor(ctx, "polygon", lendingPool),
    ]);

  return {
    balances: [...lendingPoolBalances, ...rewardsPoolBalances],
    polygon: {
      healthFactor,
    },
  };
};

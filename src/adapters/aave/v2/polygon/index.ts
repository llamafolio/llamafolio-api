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

const WMATIC: Contract = {
  address: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  chain: "polygon",
  name: "Wrapped Matic",
  symbol: "WMATIC",
  decimals: 18,
  coingeckoId: "wmatic",
};

const incentiveController: Contract = {
  name: "Aave Incentive Controller",
  address: "0x357D51124f59836DeD84c8a1730D72B749d8BC23",
  chain: "polygon",
};

export const getContracts = async () => {
  const poolsPolygon = await getLendingPoolContracts("polygon", lendingPool);

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
      getLendingPoolBalances(ctx, "polygon", poolsPolygon || []),
      getLendingRewardsBalances(
        ctx,
        "polygon",
        poolsPolygon || [],
        incentiveController,
        WMATIC
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

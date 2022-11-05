import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
  getLendingRewardsBalances,
} from "@adapters/aave/v3/common/lending";

const lendingPool: Contract = {
  chain: "fantom",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  name: "Pool",
  displayName: "Pool",
};

const poolDataProvider: Contract = {
  chain: "fantom",
  address: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  name: "Pool Data Provider",
  displayName: "Aave: Pool Data Provider V3",
};

const incentiveController: Contract = {
  chain: "fantom",
  address: "0x929EC64c34a17401F460460D4B9390518E5B473e",
  name: "Incentive Controller",
  displayName: "Aave: Incentives V3",
};

export const getContracts = async () => {
  const poolsFantom = await getLendingPoolContracts(
    "fantom",
    lendingPool,
    poolDataProvider
  );

  return {
    contracts: {
      poolsFantom,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsFantom }
) => {
  const [lendingPoolBalances, rewardsPoolBalances, healthFactor] =
    await Promise.all([
      getLendingPoolBalances(ctx, "fantom", poolsFantom || []),
      getLendingRewardsBalances(
        ctx,
        "fantom",
        incentiveController,
        poolsFantom || []
      ),
      getLendingPoolHealthFactor(ctx, "fantom", lendingPool),
    ]);

  return {
    balances: [...lendingPoolBalances, ...rewardsPoolBalances],
    fantom: {
      healthFactor,
    },
  };
};

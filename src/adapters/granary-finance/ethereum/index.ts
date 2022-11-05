import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";

const lendingPool: Contract = {
  chain: "ethereum",
  address: "0xb702ce183b4e1faa574834715e5d4a6378d0eed3",
  name: "Lending Pool",
};

export const getContracts = async () => {
  const poolsEthereum = await getLendingPoolContracts(
    "ethereum",
    lendingPool.address
  );

  return {
    contracts: {
      poolsEthereum,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { poolsEthereum }
) => {
  const [lendingPoolBalances, healthFactor] = await Promise.all([
    getLendingPoolBalances(ctx, "ethereum", poolsEthereum || [], lendingPool),
    getLendingPoolHealthFactor(ctx, "ethereum", lendingPool),
  ]);

  return {
    balances: lendingPoolBalances,
    ethereum: {
      healthFactor,
    },
  };
};

import { Contract, GetBalancesHandler } from "@lib/adapter";
import { getGLPContracts, getGLPBalances } from "../common/glp";
import { getGMXContracts, getGMXBalances } from "../common/gmx";

const GMX_Router: Contract = {
  name: "GMX: Reward Router",
  chain: "avax",
  address: "0x82147C5A7E850eA4E28155DF107F2590fD4ba327",
};

export const getContracts = async () => {
  const [GMX_Contracts_Avax, GLP_Contracts_Avax] = await Promise.all([
    await getGMXContracts("avax", GMX_Router),
    await getGLPContracts("avax", GMX_Router),
  ]);

  return {
    contracts: { GMX_Contracts_Avax, GLP_Contracts_Avax },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { GMX_Contracts_Avax, GLP_Contracts_Avax }
) => {
  const [gmxBalances, glpBalances] = await Promise.all([
    await getGMXBalances(ctx, "avax", GMX_Contracts_Avax),
    await getGLPBalances(ctx, "avax", GLP_Contracts_Avax),
  ]);

  return {
    balances: [...gmxBalances, ...glpBalances],
  };
};

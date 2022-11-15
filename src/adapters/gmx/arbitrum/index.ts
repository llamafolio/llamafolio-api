import { Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getGLPContracts,
  getGLPBalances,
  getGLPVesterBalances,
} from "../common/glp";
import {
  getGMXContracts,
  getGMXBalances,
  getGMXVesterBalances,
} from "../common/gmx";

const GMX_Router: Contract = {
  name: "GMX: Reward Router",
  chain: "arbitrum",
  address: "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1",
};

export const getContracts = async () => {
  const [GMX_Contracts_Arbitrum, GLP_Contracts_Arbitrum] = await Promise.all([
    await getGMXContracts("arbitrum", GMX_Router),
    await getGLPContracts("arbitrum", GMX_Router),
  ]);

  return {
    contracts: { GMX_Contracts_Arbitrum, GLP_Contracts_Arbitrum },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { GMX_Contracts_Arbitrum, GLP_Contracts_Arbitrum }
) => {
  const [gmxBalances, glpBalances, gmxVesterBalances, glpVesterBalances] =
    await Promise.all([
      await getGMXBalances(ctx, "arbitrum", GMX_Contracts_Arbitrum),
      await getGLPBalances(ctx, "arbitrum", GLP_Contracts_Arbitrum),
      await getGMXVesterBalances(ctx, "arbitrum", GMX_Contracts_Arbitrum),
      await getGLPVesterBalances(ctx, "arbitrum", GLP_Contracts_Arbitrum),
    ]);

  return {
    balances: [
      ...gmxBalances,
      ...glpBalances,
      ...gmxVesterBalances,
      ...glpVesterBalances,
    ],
  };
};

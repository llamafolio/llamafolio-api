import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getPoolsContracts,
  getContractsInfos,
} from "./pool";
import { getFarmingBalances, getDepositBalances } from "./balances";

const FairLaunchBSC: Contract = {
  name: "fairlaunchContractAddress",
  chain: "bsc",
  address: "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F",
};

const MiniFL: Contract = {
  name: "MiniFl",
  chain: "fantom",
  address: "0x838B7F64Fa89d322C563A6f904851A13a164f84C",
};

const getContracts = async () => {
  // Retrieve Contracts
  const [poolsContractsBSC, poolsContractsFTM] = await Promise.all([
    getPoolsContracts("bsc", FairLaunchBSC),
    getPoolsContracts("fantom", MiniFL),
  ]);

  // Retrieve Contracts Infos
  const [contractsBSC, contractsFTM] = await Promise.all([
    getContractsInfos("bsc", poolsContractsBSC),
    getContractsInfos("fantom", poolsContractsFTM),
  ]);

  return {
    contracts: { contractsBSC, contractsFTM },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { contractsBSC, contractsFTM }
) => {
  const [
    farmingbalancesBSC,
    depositBalancesBSC,
    farmingbalancesFTM,
    depositBalancesFTM,
  ] = await Promise.all([
    getFarmingBalances(ctx, "bsc", contractsBSC || []),
    getDepositBalances(ctx, "bsc", contractsBSC || []),
    getFarmingBalances(ctx, "fantom", contractsFTM || []),
    getDepositBalances(ctx, "fantom", contractsFTM || []),
  ]);

  const balances = [
    ...farmingbalancesBSC,
    ...depositBalancesBSC,
    ...farmingbalancesFTM,
    ...depositBalancesFTM,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "alpaca-finance",
  getContracts,
  getBalances,
};

export default adapter;

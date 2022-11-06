import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
} from "@lib/geist/lending";
import { getMultiFeeDistributionBalances } from "./lock";
import { Token } from "@lib/token";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "UwU Lending",
  chain: "ethereum",
  address: "0x2409aF0251DCB89EE3Dee572629291f9B087c668",
};

const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  displayName: "UwU Locker",
  chain: "ethereum",
  address: "0x7c0bF1108935e7105E218BBB4f670E5942c5e237",
};

const chefIncentivesControllerContract: Contract = {
  name: "ChefIncentivesController",
  displayName: "UwU incentives controller",
  chain: "ethereum",
  address: "0x21953192664867e19F85E96E1D1Dd79dc31cCcdB",
};

const UwU: Token = {
  chain: "ethereum",
  address: "0x55C08ca52497e2f1534B59E2917BF524D4765257",
  decimals: 18,
  symbol: "UwU",
};

const getContracts = async () => {
  const lendingPoolContracts = await getLendingPoolContracts({
    chain: "ethereum",
    lendingPool: lendingPoolContract,
    chefIncentivesController: chefIncentivesControllerContract,
    rewardToken: UwU,
  });

  return {
    contracts: lendingPoolContracts,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const lendingPoolBalances = await getLendingPoolBalances(
    ctx,
    "ethereum",
    contracts,
    {
      chefIncentivesController: chefIncentivesControllerContract,
    }
  );

  const multiFeeDistributionBalances = await getMultiFeeDistributionBalances(
    ctx,
    "ethereum",
    contracts,
    {
      multiFeeDistributionAddress: multiFeeDistributionContract.address,
    }
  );

  const balances = lendingPoolBalances.concat(multiFeeDistributionBalances);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "uwu-lend",
  getContracts,
  getBalances,
};

export default adapter;

import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
} from "@lib/geist/lending";
import { getMultiFeeDistributionBalances } from "@lib/geist/stake";
import { Token } from "@lib/token";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "Valas Lending",
  chain: "bsc",
  address: "0xe29a55a6aeff5c8b1beede5bcf2f0cb3af8f91f5",
};

const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  displayName: "Valas Locker",
  chain: "bsc",
  address: "0x685d3b02b9b0f044a3c01dbb95408fc2eb15a3b3",
};

const chefIncentivesControllerContract: Contract = {
  name: "ChefIncentivesController",
  displayName: "Valas incentives controller",
  chain: "bsc",
  address: "0xb7c1d99069a4eb582fc04e7e1124794000e7ecbf",
};

const valasToken: Token = {
  chain: "bsc",
  address: "0xb1ebdd56729940089ecc3ad0bbeeb12b6842ea6f",
  symbol: "VALAS",
  decimals: 18,
};

const getContracts = async () => {
  const lendingPoolContracts = await getLendingPoolContracts({
    chain: "bsc",
    lendingPoolAddress: lendingPoolContract.address,
    chefIncentivesControllerAddress: chefIncentivesControllerContract.address,
    rewardToken: valasToken,
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
    "bsc",
    contracts,
    {
      chefIncentivesControllerAddress: chefIncentivesControllerContract.address,
    }
  );

  const multiFeeDistributionBalances = await getMultiFeeDistributionBalances(
    ctx,
    "bsc",
    contracts,
    {
      multiFeeDistributionAddress: multiFeeDistributionContract.address,
      stakingToken: valasToken,
    }
  );

  const balances = lendingPoolBalances.concat(multiFeeDistributionBalances);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "valas-finance",
  getContracts,
  getBalances,
};

export default adapter;

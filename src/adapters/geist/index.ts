import { Adapter, Contract, resolveContractsBalances } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/geist/lending";
import { getMultiFeeDistributionBalances } from "@lib/geist/stake";
import { Token } from "@lib/token";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "Geist Lending",
  chain: "fantom",
  address: "0x9fad24f572045c7869117160a571b2e50b10d068",
};

const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  displayName: "Geist Locker",
  chain: "fantom",
  address: "0x49c93a95dbcc9a6a4d8f77e59c038ce5020e82f8",
};

const chefIncentivesControllerContract: Contract = {
  name: "ChefIncentivesController",
  displayName: "Geist incentives controller",
  chain: "fantom",
  address: "0x297fddc5c33ef988dd03bd13e162ae084ea1fe57",
};

const geistToken: Token = {
  chain: "fantom",
  address: "0xd8321aa83fb0a4ecd6348d4577431310a6e0814d",
  symbol: "GEIST",
  decimals: 18,
};

const adapter: Adapter = {
  id: "geist-finance",
  getContracts() {
    return {
      contracts: [multiFeeDistributionContract, lendingPoolContract],
    };
  },
  async getBalances(ctx, contracts) {
    function resolver(contract: Contract) {
      if (contract.address === multiFeeDistributionContract.address) {
        return getMultiFeeDistributionBalances(ctx, {
          chain: multiFeeDistributionContract.chain,
          multiFeeDistributionAddress: multiFeeDistributionContract.address,
          stakingToken: geistToken,
        });
      }

      if (contract.address === lendingPoolContract.address) {
        return getLendingPoolBalances(ctx, {
          chain: lendingPoolContract.chain,
          lendingPoolAddress: lendingPoolContract.address,
          chefIncentivesControllerAddress:
            chefIncentivesControllerContract.address,
          stakingToken: geistToken,
        });
      }
    }

    return { balances: await resolveContractsBalances(resolver, contracts) };
  },
};

export default adapter;

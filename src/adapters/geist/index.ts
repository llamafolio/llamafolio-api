import { Adapter, Contract } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";
import { getMultiFeeDistributionBalances } from "@lib/geist/stake";
import { Token } from "@lib/token";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "Geist Lending",
  chain: "fantom",
  address: "0x9FAD24f572045c7869117160A571B2e50b10d068",
};

const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  displayName: "Geist Locker",
  chain: "fantom",
  address: "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8",
};

const chefIncentivesControllerContract: Contract = {
  name: "ChefIncentivesController",
  displayName: "Geist incentives controller",
  chain: "fantom",
  address: "0x297FddC5c33Ef988dd03bd13e162aE084ea1fE57",
};

const geistToken: Token = {
  chain: "fantom",
  address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
  symbol: "GEIST",
  decimals: 18,
};

const adapter: Adapter = {
  name: "Geist",
  description: "",
  coingecko: "geist-finance",
  defillama: "geist-finance",
  links: {
    website: "https://geist.finance/",
    doc: "https://docs.geist.finance/",
  },
  getContracts() {
    return {
      contracts: [multiFeeDistributionContract, lendingPoolContract],
    };
  },
  async getBalances(ctx, contracts) {
    const [multiFeeDistributionContract, lendingPoolContract] = contracts;

    const balances = await Promise.all([
      getMultiFeeDistributionBalances(ctx, {
        chain: multiFeeDistributionContract.chain,
        multiFeeDistributionAddress: multiFeeDistributionContract.address,
        chefIncentivesControllerAddress:
          chefIncentivesControllerContract.address,
        stakingToken: geistToken,
      }),
      getLendingPoolBalances(ctx, {
        chain: lendingPoolContract.chain,
        lendingPoolAddress: lendingPoolContract.address,
      }),
    ]);

    return { balances: balances.flat() };
  },
};

export default adapter;

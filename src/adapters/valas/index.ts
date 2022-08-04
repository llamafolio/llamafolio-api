import { Adapter, Contract } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";
import { getMultiFeeDistributionBalances } from "@lib/geist/stake";
import { Token } from "@lib/token";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  dName: "Valas Lending",
  chain: "bsc",
  address: "0xe29a55a6aeff5c8b1beede5bcf2f0cb3af8f91f5",
};

const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  dName: "Valas Locker",
  chain: "bsc",
  address: "0x685d3b02b9b0f044a3c01dbb95408fc2eb15a3b3",
};

const chefIncentivesControllerContract: Contract = {
  name: "ChefIncentivesController",
  dName: "Valas incentives controller",
  chain: "bsc",
  address: "0xb7c1d99069a4eb582fc04e7e1124794000e7ecbf",
};

const valasToken: Token = {
  chain: "bsc",
  address: "0xb1ebdd56729940089ecc3ad0bbeeb12b6842ea6f",
  symbol: "VALAS",
  decimals: 18,
};

const adapter: Adapter = {
  name: "Valas Finance",
  coingecko: "valas-finance",
  defillama: "valas-finance",
  description: "",
  links: {
    website: "https://valasfinance.com/",
    doc: "https://docs.valasfinance.com/",
  },
  getContracts() {
    return {
      contracts: [multiFeeDistributionContract, lendingPoolContract],
    };
  },
  async getBalances(ctx) {
    if (ctx.contract === multiFeeDistributionContract.address) {
      return {
        balances: await getMultiFeeDistributionBalances(ctx, {
          multiFeeDistributionAddress: multiFeeDistributionContract.address,
          chefIncentivesControllerAddress:
            chefIncentivesControllerContract.address,
          stakingToken: valasToken,
        }),
      };
    }

    if (ctx.contract === lendingPoolContract.address) {
      return {
        balances: await getLendingPoolBalances(ctx, {
          lendingPoolAddress: lendingPoolContract.address,
        }),
      };
    }

    return { balances: [] };
  },
};

export default adapter;

import { Chain } from "@defillama/sdk/build/general";
import { Adapter, Contract, resolveContractsBalances } from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";

function getChainContracts(
  chain: Chain,
  { lendingPool }: { lendingPool: string }
) {
  const lendingPoolContract: Contract = {
    name: "LendingPool",
    displayName: "AAVE Lending",
    chain,
    address: lendingPool,
  };

  return [lendingPoolContract];
}

const adapter: Adapter = {
  id: "aave",
  name: "AAVE",
  description: "",
  coingecko: "aave",
  defillama: "aave",
  links: {
    website: "https://app.aave.com/",
    doc: "https://docs.aave.com/hub/",
  },
  getContracts() {
    const chainsContracts = [
      getChainContracts("avax", {
        lendingPool: "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c",
      }),
      getChainContracts("ethereum", {
        lendingPool: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
      }),
      getChainContracts("polygon", {
        lendingPool: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
      }),
    ];

    return {
      contracts: chainsContracts.flat(),
    };
  },
  async getBalances(ctx, contracts) {
    function resolver(contract: Contract) {
      if (contract.name === "LendingPool") {
        return getLendingPoolBalances(ctx, {
          chain: contract.chain,
          lendingPoolAddress: contract.address,
        });
      }
    }

    return { balances: await resolveContractsBalances(resolver, contracts) };
  },
};

export default adapter;

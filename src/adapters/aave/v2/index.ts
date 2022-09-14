import { Chain } from "@defillama/sdk/build/general";
import { Adapter, Contract } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
} from "@lib/aave/v2/lending";

const adapter: Adapter = {
  id: "aave-v2",
  async getContracts() {
    const chainsContracts = await Promise.all([
      getLendingPoolContracts(
        "avax",
        "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c"
      ),
      getLendingPoolContracts(
        "ethereum",
        "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9"
      ),
      getLendingPoolContracts(
        "polygon",
        "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf"
      ),
    ]);

    return {
      contracts: chainsContracts.flat(),
    };
  },
  async getBalances(ctx, contracts) {
    const contractsByChain: Partial<Record<Chain, Contract[]>> = {};

    for (const contract of contracts) {
      if (!contractsByChain[contract.chain]) {
        contractsByChain[contract.chain] = [];
      }
      contractsByChain[contract.chain]?.push(contract);
    }

    const chainsBalances = await Promise.all(
      Object.keys(contractsByChain).map((chain) =>
        getLendingPoolBalances(
          ctx,
          chain as Chain,
          contractsByChain[chain as Chain] || []
        )
      )
    );

    return { balances: chainsBalances.flat() };
  },
};

export default adapter;

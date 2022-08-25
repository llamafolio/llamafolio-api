import {
  AdapterResolver,
  Contract,
  resolveContractsBalances,
} from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "AAVE Lending",
  chain: "polygon",
  address: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
};

const adapterResolver: AdapterResolver = {
  getContracts() {
    return [lendingPoolContract];
  },
  getBalances(ctx, contracts) {
    function resolver(contract: Contract) {
      if (contract.address === lendingPoolContract.address) {
        return getLendingPoolBalances(ctx, {
          chain: lendingPoolContract.chain,
          lendingPoolAddress: lendingPoolContract.address,
        });
      }
    }

    return resolveContractsBalances(resolver, contracts);
  },
};

export default adapterResolver;

import {
  AdapterResolver,
  Contract,
  resolveContractsBalances,
} from "@lib/adapter";
import { getLendingPoolBalances } from "@lib/aave/v2/lending";

const lendingPoolContract: Contract = {
  name: "LendingPool",
  displayName: "AAVE Lending",
  chain: "avax",
  address: "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c",
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

import { ethers } from "ethers";
import { adapters } from "@adapters/index";
import { providers } from "@defillama/sdk/build/general";
import { ContractsConfig } from "@lib/adapter";

describe("getContracts basic validations", () => {
  let adaptersContractsConfigs: ContractsConfig[] = [];

  beforeAll(async () => {
    adaptersContractsConfigs = await Promise.all(
      adapters.map((adapter) => adapter.getContracts())
    );
    // TODO: independent timers to check that no adapter takes more than x seconds to load
  }, 50_000);

  test("should return at least 1 contract", () => {
    for (const config of adaptersContractsConfigs) {
      expect(config.contracts.length).toBeGreaterThan(0);
    }
  });

  test("should return valid contract objects", () => {
    const chains = Object.keys(providers);

    for (let i = 0; i < adaptersContractsConfigs.length; i++) {
      const adapter = adapters[i];
      const config = adaptersContractsConfigs[i];

      for (const contract of config.contracts) {
        expect(chains).toContain(contract.chain);

        // "wallet" lists coins instead of tokens
        if (adapter.name !== "Wallet") {
          expect(ethers.utils.isAddress(contract.address)).toBe(true);
        }
      }
    }
  });
});

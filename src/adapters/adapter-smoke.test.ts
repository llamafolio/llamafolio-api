import { ethers } from "ethers";
import fetch from "node-fetch";
import { adapters } from "@adapters/index";
import { providers } from "@defillama/sdk/build/general";
import { Contract, ContractsConfig } from "@lib/adapter";

function race(promise: Promise<any> | any, ms: number) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => setTimeout(() => reject(), ms)),
  ]);
}

async function fetchProtocols() {
  const res = await fetch("https://api.llama.fi/lite/protocols2");
  return res.json();
}

describe("metadata basic validations", () => {
  const protocolById: { [key: string]: any } = {};
  let protocols: any[] = [];

  beforeAll(async () => {
    protocols = await fetchProtocols();

    for (const protocol of protocols) {
      if (protocol.slug) {
        protocolById[protocol.slug] = protocol;
      }
    }

    test("adapter protocol must exist on defillama", () => {
      for (const adapter of adapters) {
        const protocol = protocolById[adapter.id];
        expect(protocol).toBeDefined();
      }
    });
  });
});

describe.skip("getContracts basic validations", () => {
  let adaptersContractsConfigs: ContractsConfig[] = [];

  beforeAll(async () => {
    // Get adapters contracts:
    // getContracts should run under 5 minutes
    adaptersContractsConfigs = await Promise.all(
      adapters.map((adapter) => race(adapter.getContracts(), 60 * 5 * 1000))
    );
  });

  test("adapter ids must be unique", () => {
    const uniqueIds = new Set(adapters.map((adapter) => adapter.id));
    expect(uniqueIds.size).toEqual(adapters.length);
  });

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

      if (config.revalidate != null) {
        expect(typeof config.revalidate).toBe("number");
        expect(config.revalidate).toBeGreaterThan(0);
      }

      if (Array.isArray(config.contracts)) {
        for (const contract of config.contracts) {
          expect(chains).toContain(contract.chain);

          // "wallet" lists coins instead of tokens
          if (adapter.id !== "wallet") {
            expect(ethers.utils.isAddress(contract.address)).toBe(true);
          }
        }
      } else {
        for (const key in config.contracts) {
          if (Array.isArray(config.contracts[key])) {
            const keyContracts = config.contracts[key] as Contract[];
            for (const contract of keyContracts) {
              expect(chains).toContain(contract.chain);
            }
          } else {
            const contract = config.contracts[key] as Contract;
            expect(chains).toContain(contract.chain);
          }
        }
      }
    }
  });
});

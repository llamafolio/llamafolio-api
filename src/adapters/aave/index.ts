import { Adapter, mergeAdaptersResolvers } from "@lib/adapter";
import avalanche from "./avalanche";
import ethereum from "./ethereum";
import polygon from "./polygon";

const multichainResolver = mergeAdaptersResolvers([
  avalanche,
  ethereum,
  polygon,
]);

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
  async getContracts() {
    return {
      contracts: await multichainResolver.getContracts(),
    };
  },
  async getBalances(ctx, contracts) {
    return { balances: await multichainResolver.getBalances(ctx, contracts) };
  },
};

export default adapter;

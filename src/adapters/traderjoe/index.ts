import { Adapter } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";
import { Contract } from "@lib/adapter";
import { getStakeBalance } from "./balances";
import { Token } from "@lib/token";

const USDC: Token = {
  // name: "USD Coin",
  chain: "avax",
  decimals: 6,
  address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
  symbol: "USDC",
};

const veJOE: Token = {
  // name: "VeJoeToken",
  chain: "avax",
  decimals: 18,
  address: "0x3cabf341943Bc8466245e4d6F1ae0f8D071a1456",
  symbol: "veJOE",
};

const rJOE: Token = {
  // name: "RocketJoeToken",
  chain: "avax",
  decimals: 18,
  address: "0x5483ce08659fABF0277f9314868Cc4f78687BD08",
  symbol: "rJOE",
};

const JOE: Contract = {
  name: "TraderJoe Token",
  chain: "avax",
  address: "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd",
  symbol: "JOE",
  decimals: 18,
  rewards: [USDC, veJOE, rJOE],
  coingeckoId: "joe",
};

const adapter: Adapter = {
  id: "trader-joe",
  async getContracts() {
    const markets = await getMarketsContracts("avax", {
      comptrollerAddress: "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC",
    });
    return {
      contracts: markets,
    };
  },
  async getBalances(ctx, contracts) {
    const stakeBalances = await getStakeBalance(ctx, "avax", JOE);
    const markets = await getMarketsBalances(ctx, "avax", contracts);

    const balances = [...stakeBalances, ...markets];

    return {
      balances,
    };
  },
};

export default adapter;

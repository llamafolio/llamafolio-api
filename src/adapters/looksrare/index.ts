import { Adapter, Balance, Contract } from "@lib/adapter";
import { getCompounderBalances, getStakeBalances } from "./balances";

const WETH: Contract = {
  name: "Wrapped Ether",
  chain: "ethereum",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  decimals: 18,
  symbols: "WETH",
};

const LOOKS: Contract = {
  name: "LooksRare Token",
  chain: "ethereum",
  address: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
  decimals: 18,
  symbols: "LOOKS",
};

const stakingContract: Contract = {
  name: "FeeSharingSystem",
  chain: "ethereum",
  address: "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce",
  rewards: [WETH],
};

const compounderContract: Contract = {
  name: "AggregatorFeeSharingWithUniswapV3",
  chain: "ethereum",
  address: "0x3ab16af1315dc6c95f83cbf522fecf98d00fd9ba",
};

const adapter: Adapter = {
  id: "looksrare",
  getContracts() {
    return {
      contracts: [stakingContract, compounderContract],
    };
  },
  async getBalances(ctx, contracts) {
    const promises: Promise<Balance>[] = [];

    for (const contract of contracts)
      if (contract.address === stakingContract.address) {
        promises.push(getStakeBalances(ctx, "ethereum", contract, LOOKS));
      } else if (contract.address === compounderContract.address) {
        promises.push(getCompounderBalances(ctx, "ethereum", contract, LOOKS));
      }

    return {
      balances: await Promise.all(promises),
    };
  },
};

export default adapter;

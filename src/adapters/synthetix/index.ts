import { Adapter, Contract } from "@lib/adapter";
import { getSNXBalancesETH } from "./balancesEth";
import { getSNXBalancesOPT} from "./balancesOpt"
import { Token } from "@lib/token";

const underlyingsEth: Token = {
  chain: "ethereum",
  decimals: 18,
  address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
  symbol: "SNX",
}

const SNXEth: Contract = {
  name: "Synthetix",
  chain: "ethereum",
  symbol: "SNX",
  decimals: 18,
  address: "0x08F30Ecf2C15A783083ab9D5b9211c22388d0564",
  underlyings : [underlyingsEth]
};

const underlyingsOpt: Token = {
  chain: "optimism",
  decimals: 18,
  address: "0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4",
  symbol: "SNX",
}

const SNXOpt: Contract = {
  name: "Synthetix",
  chain: "optimism",
  symbol: "SNX",
  decimals: 18,
  address: "0xFE8E48Bf36ccC3254081eC8C65965D1c8b2E744D",
  underlyings : [underlyingsOpt]
};

const adapter: Adapter = {
  id: "synthetix",
  async getContracts() {
    return {
      contracts: [SNXEth, SNXOpt],
    };
  },
  async getBalances(ctx, contracts) {

    const ethBalances = await getSNXBalancesETH(ctx, "ethereum", contracts.filter((contract) => contract.chain === "ethereum"));
    const optBalances = await getSNXBalancesOPT(ctx, "optimism", contracts.filter((contract) => contract.chain === "optimism"))


    const balances = [...ethBalances, ...optBalances]


    return {
      balances,
    };
  },
};

export default adapter;

import {
  Adapter,
  Contract,
  GetBalancesHandler,
  resolveContractsBalances,
} from "@lib/adapter";
import { Token } from "@lib/token";
import { getLendBorrowBalances } from "./lend";

const SNXEthereum: Token = {
  chain: "ethereum",
  decimals: 18,
  address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
  symbol: "SNX",
};

const sUSDEthereum: Token = {
  symbol: "sUSD",
  address: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
  decimals: 18,
  chain: "ethereum",
};

const SynthetixEthereum: Contract = {
  name: "Synthetix",
  chain: "ethereum",
  symbol: "SNX",
  decimals: 18,
  address: "0x08f30ecf2c15a783083ab9d5b9211c22388d0564",
  underlyings: [SNXEthereum],
};

const SNXOptimism: Token = {
  chain: "optimism",
  decimals: 18,
  address: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4",
  symbol: "SNX",
};

const sUSDOptimism: Token = {
  symbol: "sUSD",
  address: "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
  decimals: 18,
  chain: "optimism",
};

const SynthetixOptimism: Contract = {
  name: "Synthetix",
  chain: "optimism",
  symbol: "SNX",
  decimals: 18,
  address: "0xfe8e48bf36ccc3254081ec8c65965d1c8b2e744d",
  underlyings: [SNXOptimism],
};

const getContracts = async () => {
  return {
    contracts: [SynthetixEthereum, SynthetixOptimism],
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  function resolver(contract: Contract) {
    if (
      contract.chain === SynthetixEthereum.chain &&
      contract.address === SynthetixEthereum.address
    ) {
      return getLendBorrowBalances(ctx, "ethereum", {
        synthetixContract: SynthetixEthereum,
        feePoolAddress: "0x3b2f389aee480238a49e3a9985cd6815370712eb",
        sUSD: sUSDEthereum,
      });
    }

    if (
      contract.chain === SynthetixOptimism.chain &&
      contract.address === SynthetixOptimism.address
    ) {
      return getLendBorrowBalances(ctx, "optimism", {
        synthetixContract: SynthetixOptimism,
        feePoolAddress: "0xD3739A5F06747e148E716Dcb7147B9BA15b70fcc",
        sUSD: sUSDOptimism,
      });
    }
  }

  return {
    balances: await resolveContractsBalances(resolver, contracts),
  };
};

const adapter: Adapter = {
  id: "synthetix",
  getContracts,
  getBalances,
};

export default adapter;

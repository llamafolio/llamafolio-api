import { Adapter, GetBalancesHandler } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";
import { ethers } from "ethers";

const getContracts = async () => {
  const poolsMarkets = await getMarketsContracts("bsc", {
    // Apeswap Unitroller
    comptrollerAddress: "0xad48b2c9dc6709a560018c678e918253a65df86e",
    underlyingAddressByMarketAddress: {
      // oBNB -> BNB
      "0x34878f6a484005aa90e7188a546ea9e52b538f6f":
        ethers.constants.AddressZero,
    },
  });

  return {
    contracts: poolsMarkets,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getMarketsBalances(ctx, "bsc", contracts || []);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "apeswap-lending",
  getContracts,
  getBalances,
};

export default adapter;

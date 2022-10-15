import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { ethers } from "ethers";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";

const getContracts = async () => {
  const poolsMarkets = await getMarketsContracts("avax", {
    // Benqi Comptroller
    comptrollerAddress: "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4",
    underlyingAddressByMarketAddress: {
      // qiAVAX -> AVAX
      "0x5c0401e81bc07ca70fad469b451682c0d747ef1c":
        ethers.constants.AddressZero,
    },
  });
  return {
    contracts: poolsMarkets,
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getMarketsBalances(ctx, "avax", contracts);

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "benqi-lending",
  getContracts,
  getBalances,
};

export default adapter;

import { Adapter, Contract } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";
import { ethers } from "ethers";
import { getStakeBalances } from "./balances";

/** 0xcf1347dad4dd90fa73448d191950639c657ff0e2,
 *  0x513c7e3a9c69ca3e22550ef58ac1c0088e918fff
 */

const sAVAX: Contract = {
  name: "Staked AVAX",
  chain: "avax",
  address: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
  symbol: "sAVAX ",
  decimals: 18,
  coingeckoId: "benqi-liquid-staked-avax",
  category: "stake"
};

const adapter: Adapter = {
  id: "benqi",
  async getContracts() {
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
      contracts: [...poolsMarkets, sAVAX],
    };
  },
  async getBalances(ctx, contracts) {

    const stakeBalances = await getStakeBalances(ctx, "avax", sAVAX);

    const poolsMarkets = contracts.filter(
      (contract) => contract.category !== "stake"
    );
    
    const markets = await getMarketsBalances(ctx, "avax", poolsMarkets);

    const balances = [stakeBalances, ...markets]

    return {
      balances,
    };
  },
};

export default adapter;

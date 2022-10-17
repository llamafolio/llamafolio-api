import { Adapter, GetBalancesHandler } from "@lib/adapter";
import {
  getMarketsContracts,
  getMarketsBalances,
} from "@lib/compound/v2/lending";

const getContracts = async () => {
  const [
    poolsMarketsETH,
    poolsMarketsBSC,
    poolsMarketsPOLY,
    poolsMarketsARB,
    poolsMarketsOPT,
  ] = await Promise.all([
    getMarketsContracts("ethereum", {
      // WePiggy Unitroller on ETH chain
      comptrollerAddress: "0x0C8c1ab017c3C0c8A48dD9F1DB2F59022D190f0b",
      // pETH -> wETH
      underlyingAddressByMarketAddress: {
        "0x27a94869341838d5783368a8503fda5fbcd7987c":
          "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    }),
    getMarketsContracts("bsc", {
      // WePiggy Unitroller on BSC chain
      comptrollerAddress: "0x8c925623708A94c7DE98a8e83e8200259fF716E0",
      underlyingAddressByMarketAddress: {
        // pBNB -> wBNB
        "0x33a32f0ad4aa704e28c93ed8ffa61d50d51622a7":
          "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      },
    }),
    getMarketsContracts("polygon", {
      // WePiggy Unitroller on Polygon chain
      comptrollerAddress: "0xFfceAcfD39117030314A07b2C86dA36E51787948",
      underlyingAddressByMarketAddress: {
        // pMATIC -> wMATIC
        "0xc1b02e52e9512519edf99671931772e452fb4399":
          "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      },
    }),
    getMarketsContracts("arbitrum", {
      // WePiggy Unitroller on Arbitrum chain
      comptrollerAddress: "0xaa87715E858b482931eB2f6f92E504571588390b",
      underlyingAddressByMarketAddress: {
        // pETH -> wETH
        "0x17933112e9780abd0f27f2b7d9dda9e840d43159":
          "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        // pbtc -> wBTC
        "0x3393cd223f59f32cc0cc845de938472595ca48a1":
          "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      },
    }),
    getMarketsContracts("optimism", {
      // WePiggy Unitroller on Optimism chain
      comptrollerAddress: "0x896aecb9E73Bf21C50855B7874729596d0e511CB",
      underlyingAddressByMarketAddress: {
        // pETH -> wETH
        "0x8e1e582879cb8bac6283368e8ede458b63f499a5":
          "0x4200000000000000000000000000000000000006",
      },
    }),
  ]);

  return {
    contracts: {
      poolsMarketsETH,
      poolsMarketsBSC,
      poolsMarketsPOLY,
      poolsMarketsARB,
      poolsMarketsOPT,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    poolsMarketsETH,
    poolsMarketsBSC,
    poolsMarketsPOLY,
    poolsMarketsARB,
    poolsMarketsOPT,
  }
) => {
  const [balancesETH, balancesBSC, balancesPOLY, balancesARB, balancesOPT] =
    await Promise.all([
      getMarketsBalances(ctx, "ethereum", poolsMarketsETH),
      getMarketsBalances(ctx, "bsc", poolsMarketsBSC),
      getMarketsBalances(ctx, "polygon", poolsMarketsPOLY),
      getMarketsBalances(ctx, "arbitrum", poolsMarketsARB),
      getMarketsBalances(ctx, "optimism", poolsMarketsOPT),
    ]);

  const balances = [
    ...balancesETH,
    ...balancesBSC,
    ...balancesPOLY,
    ...balancesARB,
    ...balancesOPT,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "wepiggy",
  getContracts,
  getBalances,
};

export default adapter;

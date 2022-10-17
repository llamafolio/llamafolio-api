import { Adapter, GetBalancesHandler } from "@lib/adapter";
import {
  getMarketsContracts,
  getMarketsBalances,
} from "@lib/compound/v2/lending";

const getContracts = async () => {
  const comptrollerAddress = "0x0f390559f258eb8591c8e31cf0905e97cf36ace2";

  const [
    poolsMarketsETH,
    poolsMarketsFTM,
    poolsMarketsPOLY,
    poolsMarketsARB,
    poolsMarketsOPT,
  ] = await Promise.all([
    getMarketsContracts("ethereum", {
      // hundred-finance comptroller on ETH chain
      comptrollerAddress,
      underlyingAddressByMarketAddress: {
        // hETH -> wETH
        "0xfcd8570ad81e6c77b8d252bebeba62ed980bd64d":
          "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      },
    }),
    getMarketsContracts("fantom", {
      // hundred-finance comptroller on Fantom chain
      comptrollerAddress,
      underlyingAddressByMarketAddress: {
        // hFTM -> wFTM
        "0xfcd8570ad81e6c77b8d252bebeba62ed980bd64d":
          "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
      },
    }),
    getMarketsContracts("polygon", {
      // hundred-finance comptroller on Polygon chain
      comptrollerAddress: "0xEdBA32185BAF7fEf9A26ca567bC4A6cbe426e499",
      underlyingAddressByMarketAddress: {
        // hMATIC -> wMATIC
        "0xebd7f3349aba8bb15b897e03d6c1a4ba95b55e31":
          "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      },
    }),
    getMarketsContracts("optimism", {
      // hundred-finance comptroller on Optimism chain
      comptrollerAddress,
      underlyingAddressByMarketAddress: {
        // hETH -> wETH
        "0xe8f12f5492ec28609d2932519456b7436d6c93bd":
          "0x4200000000000000000000000000000000000006",
      },
    }),
    getMarketsContracts("arbitrum", {
      // hundred-finance comptroller on Arbitrum chain
      comptrollerAddress,
      underlyingAddressByMarketAddress: {
        // hETH -> wETH
        "0x8e15a22853a0a60a0fbb0d875055a8e66cff0235":
          "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      },
    }),
  ]);

  return {
    contracts: {
      poolsMarketsETH,
      poolsMarketsFTM,
      poolsMarketsPOLY,
      poolsMarketsARB,
      poolsMarketsOPT,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    poolsMarketsFTM,
    poolsMarketsETH,
    poolsMarketsPOLY,
    poolsMarketsARB,
    poolsMarketsOPT,
  }
) => {
  const [balancesETH, balancesFTM, balancesPOLY, balancesARB, balancesOPT] =
    await Promise.all([
      getMarketsBalances(ctx, "ethereum", poolsMarketsETH || []),
      getMarketsBalances(ctx, "fantom", poolsMarketsFTM || []),
      getMarketsBalances(ctx, "polygon", poolsMarketsPOLY || []),
      getMarketsBalances(ctx, "arbitrum", poolsMarketsARB || []),
      getMarketsBalances(ctx, "optimism", poolsMarketsOPT || []),
    ]);

  const balances = [
    ...balancesETH,
    ...balancesFTM,
    ...balancesPOLY,
    ...balancesARB,
    ...balancesOPT,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "hundred-finance",
  getContracts,
  getBalances,
};

export default adapter;

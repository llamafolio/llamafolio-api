import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getRewardsPoolBalances,
} from "./balances";

const poolAvax: Contract = {
  name: "poolAvax",
  displayName: "Pool Avalanche",
  chain: "avax",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  incentiveController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
};

const poolOptimism: Contract = {
  name: "poolOptimism",
  displayName: "Pool Optimism",
  chain: "optimism",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  incentiveController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
};

const poolPolygon: Contract = {
  name: "poolPolygon",
  displayName: "Pool Polygon",
  chain: "polygon",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  incentiveController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
};

const poolFantom: Contract = {
  name: "poolFantom",
  displayName: "Pool Fantom",
  chain: "fantom",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  incentiveController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
};

const poolArbitrum: Contract = {
  name: "poolArbitrum",
  displayName: "Pool Arbitrum",
  chain: "arbitrum",
  address: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  poolDataProvider: "0x69fa688f1dc47d4b5d8029d5a35fb7a548310654",
  incentiveController: "0x929EC64c34a17401F460460D4B9390518E5B473e",
};

const getContracts = async () => {
  const [
    poolAvaxContracts,
    // poolOptimismContracts,
    poolPolygonContracts,
    poolFantomContracts,
    poolArbitrumContracts,
  ] = await Promise.all([
    getLendingPoolContracts("avax", poolAvax),
    // getLendingPoolContracts("optimism", poolOptimism),
    getLendingPoolContracts("polygon", poolPolygon),
    getLendingPoolContracts("fantom", poolFantom),
    getLendingPoolContracts("arbitrum", poolArbitrum),
  ]);

  return {
    contracts: {
      poolAvaxContracts,
      poolAvax,
      //   poolOptimismContracts,
      //   poolOptimism,
      poolPolygonContracts,
      poolPolygon,
      poolFantomContracts,
      poolFantom,
      poolArbitrumContracts,
      poolArbitrum,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    poolAvaxContracts,
    // poolOptimismContracts,
    poolPolygonContracts,
    poolFantomContracts,
    poolArbitrumContracts,
    poolAvax,
    // poolOptimism,
    poolPolygon,
    poolFantom,
    poolArbitrum,
  }
) => {
  const [
    poolBalances_Avax,
    // poolBalances_OP,
    poolBalances_Polygon,
    poolBalances_FTM,
    poolBalances_Arbitrum,
  ] = await Promise.all([
    getLendingPoolBalances(ctx, "avax", poolAvaxContracts || []),
    // getLendingPoolBalances(ctx, "optimism", poolOptimismContracts || []),
    getLendingPoolBalances(ctx, "polygon", poolPolygonContracts || []),
    getLendingPoolBalances(ctx, "fantom", poolFantomContracts || []),
    getLendingPoolBalances(ctx, "arbitrum", poolArbitrumContracts || []),
  ]);

  const [
    rewardsBalances_Avax,
    // rewardsBalances_OP,
    rewardsBalances_Polygon,
    rewardsBalances_FTM,
    rewardsBalances_Arbitrum,
  ] = await Promise.all([
    getRewardsPoolBalances(ctx, "avax", poolAvaxContracts || [], poolAvax),
    // getRewardsPoolBalances(
    //   ctx,
    //   "optimism",
    //   poolOptimismContracts || [],
    //   poolOptimism
    // ),
    getRewardsPoolBalances(
      ctx,
      "polygon",
      poolPolygonContracts || [],
      poolPolygon
    ),
    getRewardsPoolBalances(
      ctx,
      "fantom",
      poolFantomContracts || [],
      poolFantom
    ),
    getRewardsPoolBalances(
      ctx,
      "arbitrum",
      poolArbitrumContracts || [],
      poolArbitrum
    ),
  ]);

  const balances = [
    ...poolBalances_Avax,
    // ...poolBalances_OP,
    ...poolBalances_Polygon,
    ...poolBalances_FTM,
    ...poolBalances_Arbitrum,
    ...rewardsBalances_Avax,
    // ...rewardsBalances_OP,
    ...rewardsBalances_Polygon,
    ...rewardsBalances_FTM,
    ...rewardsBalances_Arbitrum,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "aave-v3",
  getContracts,
  getBalances,
};

export default adapter;

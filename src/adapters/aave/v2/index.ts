import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  getLendingPoolHealthFactor,
} from "@lib/aave/v2/lending";
import { getStakeBalances, getStakeBalancerPoolBalances } from "./stake";
import { getLendingRewardsBalances } from "./rewards";

/**
 * ========== UNDERLYINGS ==========
 */

const Aave: Contract = {
  name: "Aave Token",
  address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  chain: "ethereum",
  symbol: "AAVE",
  decimals: 18,
};

const BPT: Contract = {
  name: "Balancer Pool Token",
  address: "0xc697051d1c6296c24ae3bcef39aca743861d9a81",
  chain: "ethereum",
  symbol: "BPT-Aave-wETH",
  rewards: [Aave],
};

const ABPT: Contract = {
  name: "Aave Balance Pool Token",
  address: "0x41A08648C3766F9F9d85598fF102a08f4ef84F84",
  chain: "ethereum",
  symbol: "ABPT",
  decimals: 18,
};

/**
 * ========== ETHEREUM ==========
 */

const StkAAVE_ETH: Contract = {
  name: "Staked Aave",
  address: "0x4da27a545c0c5b758a6ba100e3a049001de870f5",
  chain: "ethereum",
  symbol: "stkAAVE",
  decimals: 18,
  underlyings: [Aave],
  rewards: [Aave],
};

const stkABPT_ETH: Contract = {
  name: "Staked Aave Balance Pool Token",
  address: "0xa1116930326d21fb917d5a27f1e9943a9595fb47",
  chain: "ethereum",
  symbol: "stkABPT",
  decimals: 18,
  underlyings: [ABPT],
};

const IncentiveController_ETH: Contract = {
  name: "Aave Incentive Controller",
  address: "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5",
  chain: "ethereum",
  underlyings: [Aave],
};

const LendingPool_ETH: Contract = {
  name: "LendingPool_ETH",
  address: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
  chain: "ethereum",
  rewards: [IncentiveController_ETH],
};

/**
 * ========== AVAX ==========
 */

const IncentiveController_Avax: Contract = {
  name: "Aave Incentive Controller",
  address: "0x01d83fe6a10d2f2b7af17034343746188272cac9",
  chain: "avax",
  rewards: [Aave],
};

const LendingPool_Avax: Contract = {
  name: "LendingPool_Avax",
  address: "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c",
  chain: "avax",
  underlyings: [IncentiveController_Avax],
};

/**
 * ========== POLYGON ==========
 */
const IncentiveController_Polygon: Contract = {
  name: "Aave Incentive Controller",
  address: "0x357D51124f59836DeD84c8a1730D72B749d8BC23",
  chain: "polygon",
  rewards: [Aave],
};

const LendingPool_Polygon: Contract = {
  name: "LendingPool_Polygon",
  address: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
  chain: "polygon",
  underlyings: [IncentiveController_Polygon],
};

const getContracts = async () => {
  const [
    LendingPoolsContracts_Avax,
    LendingPoolsContracts_ETH,
    LendingPoolsContracts_Polygon,
  ] = await Promise.all([
    getLendingPoolContracts("avax", LendingPool_Avax.address),
    getLendingPoolContracts("ethereum", LendingPool_ETH.address),
    getLendingPoolContracts("polygon", LendingPool_Polygon.address),
  ]);

  return {
    contracts: {
      LendingPoolsContracts_Avax,
      LendingPool_Avax,
      LendingPoolsContracts_ETH,
      LendingPool_ETH,
      LendingPoolsContracts_Polygon,
      LendingPool_Polygon,
      IncentiveController_ETH,
      StkAAVE_ETH,
      stkABPT_ETH,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    LendingPoolsContracts_Avax,
    LendingPool_Avax,
    LendingPoolsContracts_ETH,
    LendingPool_ETH,
    LendingPoolsContracts_Polygon,
    LendingPool_Polygon,
    StkAAVE_ETH,
    stkABPT_ETH,
  }
) => {
  const [stkAAVEBalances, stkABPTBalances] = await Promise.all([
    getStakeBalances(ctx, "ethereum", StkAAVE_ETH),
    getStakeBalancerPoolBalances(ctx, "ethereum", stkABPT_ETH),
  ]);

  const [
    lendingPoolBalances_Avax,
    lendingPoolBalances_ETH,
    lendingPoolBalances_Polygon,
  ] = await Promise.all([
    getLendingPoolBalances(
      ctx,
      "avax",
      LendingPoolsContracts_Avax || [],
      LendingPool_Avax
    ),
    getLendingPoolBalances(
      ctx,
      "ethereum",
      LendingPoolsContracts_ETH || [],
      LendingPool_ETH
    ),
    getLendingPoolBalances(
      ctx,
      "polygon",
      LendingPoolsContracts_Polygon || [],
      LendingPool_Polygon
    ),
  ]);

  const [
    rewardsPoolBalances_Avax,
    rewardsPoolBalances_ETH,
    rewardsPoolBalances_Polygon,
  ] = await Promise.all([
    getLendingRewardsBalances(
      ctx,
      "avax",
      LendingPoolsContracts_Avax || [],
      LendingPool_Avax
    ),
    getLendingRewardsBalances(
      ctx,
      "ethereum",
      LendingPoolsContracts_ETH || [],
      LendingPool_ETH
    ),
    getLendingRewardsBalances(
      ctx,
      "polygon",
      LendingPoolsContracts_Polygon || [],
      LendingPool_Polygon
    ),
  ]);

  const balances = [
    ...stkAAVEBalances,
    ...stkABPTBalances,
    ...lendingPoolBalances_Avax,
    ...lendingPoolBalances_ETH,
    ...lendingPoolBalances_Polygon,
    ...rewardsPoolBalances_Avax,
    ...rewardsPoolBalances_ETH,
    ...rewardsPoolBalances_Polygon,
  ];

  const [healthFactorAvax, healthFactorEthereum, healthFactorPolygon] =
    await Promise.all([
      getLendingPoolHealthFactor(ctx, "avax", LendingPool_Avax),
      getLendingPoolHealthFactor(ctx, "ethereum", LendingPool_ETH),
      getLendingPoolHealthFactor(ctx, "polygon", LendingPool_Polygon),
    ]);

  return {
    balances,
    avax: {
      healthFactor: healthFactorAvax,
    },
    ethereum: {
      healthFactor: healthFactorEthereum,
    },
    polygon: {
      healthFactor: healthFactorPolygon,
    },
  };
};

const adapter: Adapter = {
  id: "aave-v2",
  getContracts,
  getBalances,
};

export default adapter;

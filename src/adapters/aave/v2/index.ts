import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getLendingPoolContracts,
  getLendingPoolBalances,
  
} from "@lib/aave/v2/lending";
import { getStakeBalances, getStakeBalancerPoolBalances } from "./balances";

const StkAAVE_ETH: Contract = {
  name: "Staked Aave",
  address: "0x4da27a545c0c5b758a6ba100e3a049001de870f5",
  chain: "ethereum",
  symbol: "stkAAVE",
  decimals: 18,
};

const stkABPT_ETH: Contract = {
  name: "Staked Aave Balance Pool Token",
  address: "0xa1116930326d21fb917d5a27f1e9943a9595fb47",
  chain: "ethereum",
  symbol: "stkAAVE",
  decimals: 18,
};

const LendingPool_Avax: Contract = {
  name: "LendingPool_Avax",
  address: "0x4f01aed16d97e3ab5ab2b501154dc9bb0f1a5a2c",
  chain: "avax",
};

const LendingPool_ETH: Contract = {
  name: "LendingPool_ETH",
  address: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
  chain: "ethereum",
};

const LendingPool_Polygon: Contract = {
  name: "LendingPool_Avax",
  address: "0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf",
  chain: "polygon",
};

const getContracts = async () => {
  const [LendingPools_Avax, LendingPools_ETH, LendingPools_Polygon] =
    await Promise.all([
      getLendingPoolContracts("avax", LendingPool_Avax.address),
      getLendingPoolContracts("ethereum", LendingPool_ETH.address),
      getLendingPoolContracts("polygon", LendingPool_Polygon.address),
    ]);

  return {
    contracts: {
      LendingPools_Avax,
      LendingPools_ETH,
      LendingPools_Polygon,
      StkAAVE_ETH,
      stkABPT_ETH,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    LendingPools_Avax,
    LendingPools_ETH,
    LendingPools_Polygon,
    StkAAVE_ETH,
    stkABPT_ETH,
  }
) => {
  const [
    lendingPoolBalances_Avax,
    lendingPoolBalances_ETH,
    lendingPoolBalances_Polygon,
    stakeBalances_ETH,
    stakeABPTBalances_ETH,
  ] = await Promise.all([
    getLendingPoolBalances(ctx, "avax", LendingPools_Avax),
    getLendingPoolBalances(ctx, "ethereum", LendingPools_ETH),
    getLendingPoolBalances(ctx, "polygon", LendingPools_Polygon),
    getStakeBalances(ctx, "ethereum", StkAAVE_ETH),
    getStakeBalancerPoolBalances(ctx, "ethereum", stkABPT_ETH),
  ]);

  const balances = [
    ...lendingPoolBalances_Avax,
    ...lendingPoolBalances_ETH,
    ...lendingPoolBalances_Polygon,
    ...stakeBalances_ETH,
    ...stakeABPTBalances_ETH
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "aave-v2",
  getContracts,
  getBalances,
};

export default adapter;

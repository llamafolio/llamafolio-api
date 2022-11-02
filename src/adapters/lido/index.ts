import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { Token } from "@lib/token";
import {
  getWStEthStakeBalances,
  getStEthStakeBalances,
  getStMaticBalances,
} from "./balances";

/**
 *  ========== Underlyings ==========
 */

const MATIC: Token = {
  address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
  chain: "ethereum",
  symbol: "MATIC",
  decimals: 18,
};

const wETH: Token = {
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  chain: "ethereum",
  symbol: "wETH",
  decimals: 18,
};

/**
 *  ========== Ethereum ==========
 */

const stETH: Contract = {
  name: "stETH",
  displayName: "Liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  symbol: "stETH",
  decimals: 18,
  coingeckoId: "staked-ether",
  underlyings: [wETH],
};

const wstETH: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
  underlyings: [wETH],
};

const stMATIC: Contract = {
  name: "Staked MATIC",
  displayName: "Lido staked Matic",
  chain: "polygon",
  address: "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599",
  symbol: "stMATIC",
  decimals: 18,
  coingeckoId: "staked-ether",
  underlyings: [MATIC],
};

/**
 *  ========== Arbitrum ==========
 */

const wstETH_Arbitrum: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "arbitrum",
  address: "0x5979D7b546E38E414F7E9822514be443A4800529",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
  underlyings: [wETH],
};

/**
 *  ========== Optimism ==========
 */

const wstETH_Optimism: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "optimism",
  address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
  underlyings: [wETH],
};

/**
 *  ==============================
 */

const getContracts = () => {
  return {
    contracts: { stETH, wstETH, stMATIC, wstETH_Arbitrum, wstETH_Optimism },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { stETH, wstETH, stMATIC, wstETH_Arbitrum, wstETH_Optimism }
) => {
  const [
    stakeBalances_wstEth,
    stakeBalances_stEth,
    stakeBalances_stMatic,
    stakeBalances_wstEth_Arbitrum,
    stakeBalances_wstEth_Optimism,
  ] = await Promise.all([
    getWStEthStakeBalances(ctx, "ethereum", wstETH),
    getStEthStakeBalances(ctx, "ethereum", stETH),
    getStMaticBalances(ctx, "ethereum", stMATIC),
    getWStEthStakeBalances(ctx, "arbitrum", wstETH_Arbitrum),
    getWStEthStakeBalances(ctx, "optimism", wstETH_Optimism),
  ]);

  const balances = [
    ...stakeBalances_wstEth,
    ...stakeBalances_stEth,
    ...stakeBalances_stMatic,
    ...stakeBalances_wstEth_Arbitrum,
    ...stakeBalances_wstEth_Optimism,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "lido",
  getContracts,
  getBalances,
};

export default adapter;

import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { Token } from "@lib/token";
import { getStMaticBalances } from "./balances";

const underlyings: Token = {
  address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
  chain: "ethereum",
  symbol: "MATIC",
  decimals: 18,
};

const stETH: Contract = {
  name: "stETH",
  displayName: "Liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  symbol: "stETH",
  decimals: 18,
  coingeckoId: "staked-ether",
};

const wstETH: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "ethereum",
  address: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
};

const stMATIC: Contract = {
  name: "Staked MATIC",
  displayName: "Lido staked Matic",
  chain: "polygon",
  address: "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599",
  symbol: "stMATIC",
  decimals: 18,
  coingeckoId: "staked-ether",
  underlyings: [underlyings],
};

const getContracts = () => {
  return {
    contracts: [stETH, wstETH, stMATIC],
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const ethereumBalances = await getERC20BalanceOf(
    ctx,
    "ethereum",
    contracts.filter((contract) => contract.chain === "ethereum")
  );

  const polygonBalances = await getStMaticBalances(
    ctx,
    "ethereum",
    contracts.filter((contract) => contract.chain === "polygon")
  );

  const balances = [...ethereumBalances, ...polygonBalances];

  return {
    balances: balances.map((bal) => ({ ...bal, category: "stake" })),
  };
};

const adapter: Adapter = {
  id: "lido",
  getContracts,
  getBalances,
};

export default adapter;

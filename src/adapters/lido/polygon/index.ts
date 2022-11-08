import { Contract, GetBalancesHandler } from "@lib/adapter";
import { getStMaticBalances } from "@adapters/lido/common/stake";

const MATIC: Contract = {
  address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
  chain: "ethereum",
  symbol: "MATIC",
  decimals: 18,
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

export const getContracts = () => {
  return {
    contracts: {
      stMATIC,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { stMATIC }
) => {
  const balances = await getStMaticBalances(ctx, "polygon", stMATIC);

  return {
    balances,
  };
};

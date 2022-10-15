import { Adapter, Balance, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./balances";

const sAVAX: Contract = {
  name: "Staked AVAX",
  chain: "avax",
  address: "0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be",
  symbol: "sAVAX ",
  decimals: 18,
  coingeckoId: "benqi-liquid-staked-avax",
  category: "stake",
};

const getContracts = () => {
  return {
    contracts: [sAVAX],
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const promises: Promise<Balance>[] = [];

  for (const contract of contracts) {
    if (contract.address === sAVAX.address) {
      promises.push(getStakeBalances(ctx, "avax", contract));
    }
  }

  return {
    balances: await Promise.all(promises),
  };
};

const adapter: Adapter = {
  id: "benqi-staked-avax",
  getContracts,
  getBalances,
};

export default adapter;

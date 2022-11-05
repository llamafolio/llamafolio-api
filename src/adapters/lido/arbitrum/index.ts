import { Contract, GetBalancesHandler } from "@lib/adapter";
import { getWStEthStakeBalances } from "@adapters/lido/common/stake";

const WETHArbitrum: Contract = {
  address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  chain: "arbitrum",
  symbol: "WETH",
  decimals: 18,
  coingeckoId: "weth",
};

const wstETHArbitrum: Contract = {
  name: "wstETH",
  displayName: "Wrapped liquid staked Ether 2.0",
  chain: "arbitrum",
  address: "0x5979D7b546E38E414F7E9822514be443A4800529",
  symbol: "wstETH",
  decimals: 18,
  coingeckoId: "wrapped-steth",
  underlyings: [WETHArbitrum],
};

export const getContracts = () => {
  return {
    contracts: {
      wstETHArbitrum,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { wstETHArbitrum }
) => {
  const balances = await getWStEthStakeBalances(
    ctx,
    "arbitrum",
    wstETHArbitrum
  );

  return {
    balances,
  };
};

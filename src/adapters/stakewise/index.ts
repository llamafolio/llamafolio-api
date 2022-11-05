import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { isNotNullish } from "@lib/type";
import { getStakeBalances } from "@adapters/stakewise/stake";

const WETH: Contract = {
  name: "WETH",
  chain: "ethereum",
  address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  decimals: 18,
  symbol: "WETH",
};

const sEth2: Contract = {
  name: "StakeWise Staked ETH2",
  chain: "ethereum",
  address: "0xFe2e637202056d30016725477c5da089Ab0A043A",
  decimals: 18,
  symbol: "sETH2",
  underlyings: [WETH],
  category: "stake",
};

const rEth2: Contract = {
  name: "StakeWise Reward ETH2",
  chain: "ethereum",
  address: "0x20bc832ca081b91433ff6c17f85701b6e92486c5",
  decimals: 18,
  symbol: "rEth2",
  underlyings: [WETH],
  category: "reward",
};

const getContracts = () => {
  return {
    contracts: { sEth2, rEth2 },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sEth2, rEth2 }
) => {
  const balances = await getStakeBalances(
    ctx,
    "ethereum",
    [sEth2, rEth2].filter(isNotNullish)
  );

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "stakewise",
  getContracts,
  getBalances,
};

export default adapter;

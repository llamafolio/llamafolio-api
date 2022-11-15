import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { Token } from "@lib/token";
import { getAssetsContracts, getLendBorrowBalances } from "./lend";
import { getRewardBalances } from "./rewards";
import { getStakeBalances } from "./stake";

const USDC: Token = {
  chain: "ethereum",
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  decimals: 6,
  symbol: "USDC ",
};

const CompoundUSDCv3: Contract = {
  chain: "ethereum",
  address: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
  underlyings: [USDC],
};

const CompoundRewards: Contract = {
  chain: "ethereum",
  address: "0x1B0e765F6224C21223AeA2af16c1C46E38885a40",
};

const getContracts = async () => {
  const assets = await getAssetsContracts("ethereum", CompoundUSDCv3);

  return {
    contracts: { CompoundUSDCv3, assets, CompoundRewards },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { CompoundUSDCv3, assets, CompoundRewards }
) => {
  const [stakeBalances, lendBorrowBalances, rewardsBalances] =
    await Promise.all([
      getStakeBalances(ctx, "ethereum", CompoundUSDCv3),
      getLendBorrowBalances(ctx, "ethereum", CompoundUSDCv3, assets),
      getRewardBalances(ctx, "ethereum", CompoundRewards, CompoundUSDCv3),
    ]);

  return {
    balances: [...stakeBalances, ...lendBorrowBalances, ...rewardsBalances],
  };
};

const adapter: Adapter = {
  id: "compound",
  getContracts,
  getBalances,
};

export default adapter;

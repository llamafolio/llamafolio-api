import { Chain } from "@defillama/sdk/build/general";
import { Adapter, Balance, BaseContext, Contract } from "@lib/adapter";
// import { getUnderlyingsContract } from "@lib/uniswap/v2/pair";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { call } from "@defillama/sdk/build/abi";

const stakingContract = "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce";

const getStakedBalances = async (ctx: BaseContext, chain: Chain) => {
  const [rewardsBalanceRes, stakeBalanceRes] = await Promise.all([
    call({
      chain,
      target: stakingContract,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "calculatePendingRewards",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: stakingContract,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "calculateSharesValueInLOOKS",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const stakeBalance = BigNumber.from(stakeBalanceRes.output);
  const rewardsBalance = BigNumber.from(rewardsBalanceRes.output);

  const balance = {
    ...LooksRare,
    amount: stakeBalance,
    rewards: [{...underlyings, amount: rewardsBalance}],
    category: "stake"
  }
  return balance
};

const underlyings: Contract = {
  name: "Wrapped Ether",
  chain: "ethereum",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  decimals: 18,
  symbols: "WETH",
};

const LooksRare: Contract = {
  name: "LooksRare Token",
  chain: "ethereum",
  address: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
  decimals: 18,
  symbols: "LOOKS",
};

const adapter: Adapter = {
  id: "looksrare",
  async getContracts() {
    return {
      contracts: [LooksRare],
    };
  },
  async getBalances(ctx, contracts) {
    const stakingBalances = await getStakedBalances(ctx, "ethereum")

    let balances = [stakingBalances];

    return {
      balances,
    };
  },
};

export default adapter;

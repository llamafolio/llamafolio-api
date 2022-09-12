import { ethers, BigNumber } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { Balance, BaseContext } from "@lib/adapter";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { getReserveTokens } from "@lib/aave/v2/tokens";
import { Token } from "@lib/token";
import ChefIncentivesControllerABI from "./abis/ChefIncentivesController.json";

export type GetLendingPoolBalancesParams = {
  chain: Chain;
  lendingPoolAddress: string;
  chefIncentivesControllerAddress: string;
  stakingToken: Token;
};

export async function getLendingPoolBalances(
  ctx: BaseContext,
  {
    chain,
    lendingPoolAddress,
    chefIncentivesControllerAddress,
    stakingToken,
  }: GetLendingPoolBalancesParams
) {
  const balances: Balance[] = [];
  const provider = providers[chain];

  const reserveTokens = await getReserveTokens({
    chain,
    lendingPoolAddress,
  });
  const underlyingTokensAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.underlyingTokenAddress
  );
  const aTokens = reserveTokens.map(
    (reserveToken) => reserveToken.aTokenAddress
  );
  const stableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.stableDebtTokenAddress
  );
  const variableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.variableDebtTokenAddress
  );

  const [
    underlyingTokens,
    aBalances,
    stableDebtTokenAddressesBalances,
    variableDebtTokenAddressesBalances,
  ] = await Promise.all([
    getERC20Details(chain, underlyingTokensAddresses),
    getERC20Balances(ctx, chain, aTokens),
    getERC20Balances(ctx, chain, stableDebtTokenAddresses),
    getERC20Balances(ctx, chain, variableDebtTokenAddresses),
  ]);

  for (let i = 0; i < aBalances.length; i++) {
    const aBalance = aBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: aBalance.amount,
      category: "lend",
    });
  }

  for (let i = 0; i < stableDebtTokenAddressesBalances.length; i++) {
    const stableDebtTokenAddressesBalance = stableDebtTokenAddressesBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: stableDebtTokenAddressesBalance.amount,
      category: "borrow",
      type: "debt",
      stable: true,
    });
  }

  for (let i = 0; i < variableDebtTokenAddressesBalances.length; i++) {
    const variableDebtTokenAddressesBalance =
      variableDebtTokenAddressesBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: variableDebtTokenAddressesBalance.amount,
      category: "borrow",
      type: "debt",
      stable: false,
    });
  }

  // lending / borrowing rewards
  const chefIncentives = new ethers.Contract(
    chefIncentivesControllerAddress,
    ChefIncentivesControllerABI,
    provider
  );

  const lmRewardsCount = (await chefIncentives.poolLength()).toNumber();

  const registeredTokensRes = await multicall({
    chain,
    calls: Array(lmRewardsCount)
      .fill(undefined)
      .map((_, i) => ({
        target: chefIncentives.address,
        params: [i],
      })),
    abi: {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "registeredTokens",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  });
  const registeredTokensAddresses = registeredTokensRes.map(
    (res) => res.output
  );

  const lmClaimableRewards: BigNumber[] = await chefIncentives.claimableReward(
    ctx.address,
    registeredTokensAddresses
  );

  let totalLMRewards = BigNumber.from("0");
  for (let index = 0; index < lmClaimableRewards.length; index++) {
    totalLMRewards = totalLMRewards.add(lmClaimableRewards[index]);
  }

  const rewardBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: totalLMRewards,
    category: "vestable-reward",
    reward: true,
    debt: false,
  };
  balances.push(rewardBalance);

  return balances;
}

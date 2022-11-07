import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";
import { getERC20Details, abi } from "@lib/erc20";
import { getCVXRatio } from "./helper";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { range } from "@lib/array";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  const balances: Balance[] = [];

  if (!contract || !contract.underlyings?.[0] || !contract.rewards) {
    console.log("Missing or Incorrect staking contract");

    return [];
  }

  try {
    const [stakeBalanceRes, earnedBalanceRes, extraRewardsLengthRes] =
      await Promise.all([
        call({
          chain,
          target: contract.address,
          params: [ctx.address],
          abi: abi.balanceOf,
        }),

        call({
          chain,
          target: contract.address,
          params: [ctx.address],
          abi: {
            inputs: [
              {
                internalType: "address",
                name: "account",
                type: "address",
              },
            ],
            name: "earned",
            outputs: [
              {
                internalType: "uint256",
                name: "",
                type: "uint256",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
        }),

        call({
          chain,
          target: contract.address,
          params: [],
          abi: {
            inputs: [],
            name: "extraRewardsLength",
            outputs: [
              {
                internalType: "uint256",
                name: "",
                type: "uint256",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
        }),
      ]);

    const extraRewardsTokenRes = await multicall({
      chain,
      calls: range(0, extraRewardsLengthRes.output).map((i) => ({
        target: contract.address,
        params: [i],
      })),
      abi: {
        inputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        name: "extraRewards",
        outputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const extraRewardsToken = extraRewardsTokenRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const [earnedExtraRewardsRes, extraRewardsTokensAddressesRes] =
      await Promise.all([
        multicall({
          chain,
          calls: extraRewardsToken.map((contract) => ({
            target: contract,
            params: [ctx.address],
          })),
          abi: {
            inputs: [
              { internalType: "address", name: "account", type: "address" },
            ],
            name: "earned",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),

        multicall({
          chain,
          calls: extraRewardsToken.map((contract) => ({
            target: contract,
            params: [],
          })),
          abi: {
            inputs: [],
            name: "rewardToken",
            outputs: [
              { internalType: "contract IERC20", name: "", type: "address" },
            ],
            stateMutability: "view",
            type: "function",
          },
        }),
      ]);

    const amount = BigNumber.from(stakeBalanceRes.output);
    const earnedBalances = BigNumber.from(earnedBalanceRes.output);
    const extraRewardsTokensAddresses = extraRewardsTokensAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const rewardsTokens = await getERC20Details(
      chain,
      extraRewardsTokensAddresses
    );

    const earnedExtraRewards = earnedExtraRewardsRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output));

    const formattedRewards: any = await getCVXRatio(
      chain,
      contract.rewards?.[1],
      earnedBalances
    );

    for (let i = 0; i < rewardsTokens.length; i++) {
      const token = rewardsTokens[i];
      const earnedExtraReward = earnedExtraRewards[i];

      balances.push({
        chain,
        address: contract.underlyings?.[0].address,
        symbol: contract.underlyings?.[0].symbol,
        decimals: contract.underlyings?.[0].decimals,
        amount,
        rewards: [
          { ...contract.rewards?.[0], amount: earnedBalances },
          { ...contract.rewards?.[1], amount: formattedRewards },
          { ...token, amount: earnedExtraReward },
        ],
        category: "stake",
        yieldKey: "ef32dd3b-a03b-4f79-9b65-8420d7e04ad0",
      });
    }

    return balances;
  } catch (error) {
    console.log("Failed to get stake balance");
    
    return []
  }
}

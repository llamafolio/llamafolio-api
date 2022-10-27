import { ethers, BigNumber } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import { call, multiCall } from "@defillama/sdk/build/abi";

export async function getLendingPoolContracts(
  chain: Chain,
  lendingPool?: Contract
) {
  if (!lendingPool) {
    return [];
  }

  try {
    const contracts: Contract[] = [];

    const reserveListRes = await call({
      chain,
      target: lendingPool.address,
      params: [],
      abi: {
        inputs: [],
        name: "getReservesList",
        outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
      },
    });

    const underlyingsAddresses: string[] = reserveListRes.output;

    const calls = underlyingsAddresses.map((address) => ({
      target: lendingPool.poolDataProvider,
      params: [address],
    }));

    const reserveTokensAddressesRes = await multiCall({
      chain,
      calls,
      abi: {
        inputs: [{ internalType: "address", name: "asset", type: "address" }],
        name: "getReserveTokensAddresses",
        outputs: [
          { internalType: "address", name: "aTokenAddress", type: "address" },
          {
            internalType: "address",
            name: "stableDebtTokenAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "variableDebtTokenAddress",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const reserveTokensAddresses = reserveTokensAddressesRes.output
      .filter((res) => res.success)
      .map((res) => res.output);

    const lendTokensAddresses = reserveTokensAddresses.map(
      (token) => token.aTokenAddress
    );
    const borrowTokensAddresses = reserveTokensAddresses.map(
      (token) => token.variableDebtTokenAddress
    );

    const [underlyingsTokens, lendTokens, borrowTokens] = await Promise.all([
      getERC20Details(chain, underlyingsAddresses),
      getERC20Details(chain, lendTokensAddresses),
      getERC20Details(chain, borrowTokensAddresses),
    ]);

    for (let i = 0; i < lendTokens.length; i++) {
      if (!underlyingsTokens || !lendTokens) {
        return [];
      }
      const lendToken = lendTokens[i];

      contracts.push({
        ...lendToken,
        underlyings: [underlyingsTokens[i]],
        category: "lend",
      });
    }

    for (let i = 0; i < borrowTokens.length; i++) {
      if (!underlyingsTokens || !borrowTokens) {
        return [];
      }
      const borrowToken = borrowTokens[i];

      contracts.push({
        ...borrowToken,
        underlyings: [underlyingsTokens[i]],
        category: "borrow",
      });
    }
    return contracts;
  } catch (error) {
    return [];
  }
}

export async function getLendingPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = await getERC20BalanceOf(
    ctx,
    chain,
    contracts as Token[]
  );

  // use the same amount for underlyings
  for (const balance of balances) {
    if (balance.amount.gt(0) && balance.underlyings) {
      balance.underlyings[0].amount = BigNumber.from(balance.amount);
    }
  }

  return balances;
}

export async function getRewardsPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  lendingPool?: Contract
) {
  if (!lendingPool) {
    return [];
  }

  try {
    const rewards: Balance[] = [];
    const assets: any = contracts.map((contract: Contract) => contract.address);

    const rewardsListsRes = await call({
      chain,
      target: lendingPool.incentiveController,
      params: [assets, ctx.address],
      abi: {
        inputs: [
          { internalType: "address[]", name: "assets", type: "address[]" },
          { internalType: "address", name: "user", type: "address" },
        ],
        name: "getAllUserRewards",
        outputs: [
          {
            internalType: "address[]",
            name: "rewardsList",
            type: "address[]",
          },
          {
            internalType: "uint256[]",
            name: "unclaimedAmounts",
            type: "uint256[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const rewardsLists = rewardsListsRes.output;

    const rewardsAddress = rewardsLists.rewardsList;
    const rewardsTokens = await getERC20Details(chain, rewardsAddress);
    const rewardsBalances = BigNumber.from(rewardsLists.unclaimedAmounts[0]);

    const reward: Balance = {
      ...rewardsTokens[0],
      amount: rewardsBalances,
      category: "reward",
    };

    rewards.push(reward);
    return rewards;
  } catch (error) {
    return [];
  }
}

import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
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

    const reservesList: string[] = reserveListRes.output;

    const calls = reservesList.map((address) => ({
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

    const underlyingTokensAddresses: string[] = [];
    const lendTokensAddresses: string[] = [];
    const borrowTokensAddresses: string[] = [];

    for (let i = 0; i < reserveTokensAddresses.length; i++) {
      const reserveTokensAddress = reserveTokensAddresses[i];

      underlyingTokensAddresses.push(reservesList[i].toLowerCase());
      lendTokensAddresses.push(reserveTokensAddress.aTokenAddress);
      borrowTokensAddresses.push(reserveTokensAddress.variableDebtTokenAddress);
    }

    const [underlyingsTokens, lendTokens, borrowTokens] = await Promise.all([
      getERC20Details(chain, underlyingTokensAddresses),
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
  contracts: Contract[],
  lendingPool?: Contract
) {
  if (!lendingPool) {
    return [];
  }

  try {
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

    const UserHealthRes = await call({
      chain,
      target: lendingPool.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "getUserAccountData",
        outputs: [
          {
            internalType: "uint256",
            name: "totalCollateralBase",
            type: "uint256",
          },
          { internalType: "uint256", name: "totalDebtBase", type: "uint256" },
          {
            internalType: "uint256",
            name: "availableBorrowsBase",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "currentLiquidationThreshold",
            type: "uint256",
          },
          { internalType: "uint256", name: "ltv", type: "uint256" },
          { internalType: "uint256", name: "healthFactor", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const UserHealth = UserHealthRes.output.healthFactor / 10 ** 18;
    console.log(
      `User: ${ctx.address} - Adapter: ${
        process.argv[2]
      } - Chain: ${chain} - HealthFactor: ${UserHealth > 10 ? 10 : UserHealth}`
    );

    return balances;
  } catch (error) {
    return [];
  }
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

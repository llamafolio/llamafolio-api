import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Token } from "@lib/token";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";
import {
  uTokens,
  assets,
  lendAddress,
  walletAddress,
  multifeesDistribution,
  fees,
} from "./address";
import { getERC20Details } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";

export type GetBalancesParams = {
  uTokens: Token[];
  assets: Token[];
  lendAddress: string;
  walletAddress: string;
  fees: string;
  multifeesDistribution: string;
};

const UwU: Token = {
  chain: "ethereum",
  address: "0x55C08ca52497e2f1534B59E2917BF524D4765257",
  decimals: 18,
  symbol: "UwU",
};

export async function getBalances(ctx: BaseContext, chain: Chain) {
  const balances = [];
  const multifeesLocked = [];
  const claimableAmount = [];
  const underlyings: Contract[] = await getERC20Details(chain, assets);
  const contracts: Contract[] = await getERC20Details(chain, uTokens);

  const lendingCalls = uTokens.map((token) => ({
    target: lendAddress,
    params: [ctx.address, token],
  }));

  const borrowCalls = assets.map((token) => ({
    target: walletAddress,
    params: [token, ctx.address],
  }));

  const [
    lendRes,
    borrowRes,
    claimableRes,
    withdrawableBalanceRes,
    multifeesLockedRes,
  ] = await Promise.all([
    multicall({
      chain,
      calls: lendingCalls,
      abi: {
        inputs: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "address", name: "token", type: "address" },
        ],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
    multicall({
      chain,
      calls: borrowCalls,
      abi: {
        inputs: [
          { internalType: "address", name: "asset", type: "address" },
          { internalType: "address", name: "user", type: "address" },
        ],
        name: "getUserReserveData",
        outputs: [
          {
            internalType: "uint256",
            name: "currentATokenBalance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "currentStableDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "currentVariableDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "principalStableDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "scaledVariableDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "stableBorrowRate",
            type: "uint256",
          },
          { internalType: "uint256", name: "liquidityRate", type: "uint256" },
          {
            internalType: "uint40",
            name: "stableRateLastUpdated",
            type: "uint40",
          },
          {
            internalType: "bool",
            name: "usageAsCollateralEnabled",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
    call({
      chain,
      target: fees,
      params: [ctx.address, uTokens],
      abi: {
        inputs: [
          { internalType: "address", name: "_user", type: "address" },
          { internalType: "address[]", name: "_tokens", type: "address[]" },
        ],
        name: "claimableReward",
        outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
        stateMutability: "view",
        type: "function",
      },
    }),
    call({
      chain,
      target: multifeesDistribution,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "withdrawableBalance",
        outputs: [
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "penaltyAmount", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountWithoutPenalty",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
    call({
      chain,
      target: multifeesDistribution,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "claimableRewards",
        outputs: [
          {
            components: [
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            internalType: "struct MultiFeeDistribution.RewardData[]",
            name: "rewards",
            type: "tuple[]",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const lendAmount = lendRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  for (let i = 0; i < uTokens.length; i++) {
    const lendBalances = {
      ...contracts[i],
      category: "lend",
      amount: lendAmount[i],
      underlyings: [{ ...underlyings[i], amount: lendAmount[i] }],
    };
    balances.push(lendBalances);
  }

  const borrowAmount = borrowRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output.currentVariableDebt));

  for (let i = 0; i < uTokens.length; i++) {
    const borrowBalances = {
      ...contracts[i],
      category: "borrow",
      amount: borrowAmount[i],
      underlyings: [{ ...underlyings[i], amount: borrowAmount[i] }],
    };
    balances.push(borrowBalances);
  }

  for (let i = 0; i < uTokens.length; i++) {
    if (lendAmount[i]._hex !== "0x00") {
      let claimable = lendAmount[i]
        .add(borrowAmount[i])
        .mul(claimableRes.output[i])
        .div(lendAmount[i]);
      claimableAmount.push(claimable);
    }
  }

  const claimableBalances = {
    ...UwU,
    category: "rewards",
    amount: claimableAmount.reduce((acc, num) => acc.add(num)),
  };
  balances.push(claimableBalances);

  const withdrawable = BigNumber.from(withdrawableBalanceRes.output.amount);
  const withdrawableBalance = {
    ...UwU,
    category: "rewards",
    amount: withdrawable,
  };
  balances.push(withdrawableBalance);

  for (let i = 0; i < uTokens.length + 1; i++) {
    const multifee = BigNumber.from(multifeesLockedRes.output[i].amount);
    multifeesLocked.push(multifee);
  }
  const multifeesLockBalances = multifeesLocked.slice(1, 11);

  for (let i = 0; i < multifeesLockBalances.length; i++) {
    const rewardsBalances = {
      ...contracts[i],
      category: "Locked",
      amount: multifeesLockBalances[i],
      underlyings: [{ ...underlyings[i], amount: multifeesLockBalances[i] }],
    };
    balances.push(rewardsBalances);
  }

  return balances;
}

import { BigNumber, ethers } from "ethers";
import { Balance, BaseContext } from "@lib/adapter";
import { multicall } from "@lib/multicall";
import { Token } from "@lib/token";

import MasterChefAbi from "./abis/MasterChef.json";
import { Chain, providers } from "@lib/providers";

export type GetMasterChefPoolsInfoParams = {
  chain: Chain;
  masterChefAddress: string;
};

export async function getMasterChefPoolsInfo({
  chain,
  masterChefAddress,
  methodName
}: GetMasterChefPoolsInfoParams) {
  const provider = providers[chain];
  const masterChef = new ethers.Contract(
    masterChefAddress,
    MasterChefAbi,
    provider
  );

  const poolLength = await masterChef.poolLength();

  const calls = [];
  for (let i = 0; i < poolLength; i++) {
    calls.push({
      params: [i],
      target: masterChefAddress,
    });
  }

  const poolsInfoRes = await multicall({
    chain,
    calls,
    abi: (methodName === "poolInfo" || methodName == null)?poolInfoAbi:lpTokenAbi,
  });


  let poolsInfo = []

  if ((methodName === "poolInfo" || methodName == null)) {


    poolsInfo = poolsInfoRes
      .filter((res) => res.success)
      .map((res) => ({ ...res.output, pid: res.input.params[0] }))
  } else {

    poolsInfo = poolsInfoRes
      .filter((res) => res.success)
      .map((res) => ({ "lpToken": res.output, pid: res.input.params[0] }))
  }

  return poolsInfo;
}

export type GetMasterChefBalancesParams = {
  chain: Chain;
  masterChefAddress: string;
  tokens: Token[];
  rewardToken: Token;
};

export async function getMasterChefBalances(
  ctx: BaseContext,
  { chain, masterChefAddress, tokens, rewardToken, pendingRewardName }: GetMasterChefBalancesParams
) {
  const provider = providers[chain];
  const masterChef = new ethers.Contract(
    masterChefAddress,
    MasterChefAbi,
    provider
  );


  // token amounts
  const userInfoRes = await multicall({
    chain,
    calls: tokens.map((token) => ({
      params: [token.pid, ctx.address],
      target: masterChef.address,
    })),
    abi: {
      inputs: [
        { internalType: "uint256", name: "", type: "uint256" },
        { internalType: "address", name: "", type: "address" },
      ],
      name: "userInfo",
      outputs: [
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "uint256", name: "rewardDebt", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const resBalances: Balance[] = [];

  for (let i = 0; i < userInfoRes.length; i++) {
    const res = userInfoRes[i];
    if (res.success) {
      const balance: Balance = {
        ...tokens[i],
        category: "farm",
        amount: BigNumber.from(res.output.amount),
      };
      resBalances.push(balance);
    }
  }


  pendingRewardAbi = JSON.parse(JSON.stringify(pendingRewardAbi).replace("pendingSushi", pendingRewardName))

  // rewards
  const pendingRewardsRes = await multicall({
    chain,
    calls: resBalances.map((token) => ({
      params: [token.pid, ctx.address],
      target: masterChef.address,
    })),
    abi: pendingRewardAbi,
  });


  for (let i = 0; i < pendingRewardsRes.length; i++) {
    const res = pendingRewardsRes[i];
    if (res.success) {
      const parent = resBalances[i];
      if (!parent.rewards) {
        parent.rewards = [];
      }
      parent.rewards.push({
        ...rewardToken,
        category: "reward",
        type: "reward",
        amount: BigNumber.from(res.output),
        claimable: BigNumber.from(res.output),
      });
    }
  }

  return resBalances;
}

let pendingRewardAbi = {
  inputs: [
    {
      internalType: "uint256",
      name: "_pid",
      type: "uint256",
    },
    {
      internalType: "address",
      name: "_user",
      type: "address",
    },
  ],
  name: "pendingSushi",
  outputs: [
    {
      internalType: "uint256",
      name: "pending",
      type: "uint256",
    },
  ],
  stateMutability: "view",
  type: "function",
};

let poolInfoAbi = {
  inputs: [
    {
      internalType: "uint256",
      name: "",
      type: "uint256",
    },
  ],
  name: "poolInfo",
  outputs: [
    {
      internalType: "address",
      name: "lpToken",
      type: "address",
    },
    {
      internalType: "uint128",
      name: "accSushiPerShare",
      type: "uint128",
    },
    {
      internalType: "uint64",
      name: "lastRewardBlock",
      type: "uint64",
    },
    {
      internalType: "uint64",
      name: "allocPoint",
      type: "uint64",
    },
  ],
  stateMutability: "view",
  type: "function",
};

let lpTokenAbi =   {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "lpToken",
    "outputs": [
      {
        "internalType": "contract IBEP20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }

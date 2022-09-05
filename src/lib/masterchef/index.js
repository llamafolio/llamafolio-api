import { providers, Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext } from "@lib/adapter";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { ethers, BigNumber } from "ethers";
import { multicall } from "@lib/multicall";


import MasterChefAbi from "./abis/MasterChef.json";

//pendingRewardMethod == tends to vary from contract to contract


export async function returnMasterChefDetails(ctx, chain, contract, pendingRewardMethod = null) {


  const provider = providers[chain]
  const MasterChef = new ethers.Contract(
    contract,
    MasterChefAbi,
    provider
  );


  const poolLength =  await MasterChef.poolLength()

  let calls = [];
  for (let d = 0; d < poolLength; d++) {
    calls.push({
      params: [d],
      target: contract,
    });
  }

  const poolInfoRes = await multicall({
    chain: chain,
    calls: calls,
    abi: poolInfoAbi,
  });

  const poolInfo = poolInfoRes
    .filter((res) => res.success)
    .map((res) => res.output);


  calls = [];
  for (let d = 0; d < poolInfo.length; d++) {
    calls.push({
      params: [d, ctx.address],
      target: MasterChef.address,
    });
  }
  const balancesDRes = await multicall({
    chain: chain,
    calls: calls,
    abi: {"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"}],"stateMutability":"view","type":"function"},
  });
  const balancesD = balancesDRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const masterChefBalances = []
  const nonZeroBalances = []
  const nonZeroTokens = []
  for (var i = 0; i < balancesDRes.length; i++) {
    const row = balancesDRes[i]
    if (row.output.amount > 0) {
      nonZeroBalances.push(row.input.params[0])
      nonZeroTokens.push( poolInfo[i].lpToken )
    }
  }

  const tokenDetails = await getERC20Details(chain, nonZeroTokens)

  pendingRewardAbi =  (!pendingRewardMethod)? pendingRewardAbi: JSON.parse(JSON.stringify(pendingRewardAbi).replace("pendingSushi", pendingRewardMethod))

  calls = [];
  for (let d = 0; d < nonZeroBalances.length; d++) {
    calls.push({
      params: [nonZeroBalances[d], ctx.address],
      target: MasterChef.address,
    });
  }
  const pendingRewardsRes = await multicall({
    chain: chain,
    calls: calls,
    abi: pendingRewardAbi,
  });


  const pendingRewards = pendingRewardsRes
    .filter((res) => res.success)
    .map((res) => res.output);


  let rewardCount = 0
  for (var i = 0; i < balancesDRes.length; i++) {
    const row = balancesDRes[i]
    if (row.output.amount > 0) {
      masterChefBalances.push({
        poolInfo: poolInfo[i],
        amount: row.output.amount,
        token: tokenDetails[rewardCount],
        rewardDebt: row.output.rewardDebt,
        pid: row.input.params[0],
        rewardsPending: pendingRewards[rewardCount]
      })

      rewardCount++
    }
  }

  return masterChefBalances

}

let pendingRewardAbi =   {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_pid",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "pendingSushi",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "pending",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }

const poolInfoAbi = {
  "inputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "name": "poolInfo",
  "outputs": [
    {
      "internalType": "address",
      "name": "lpToken",
      "type": "address"
    },
    {
      "internalType": "uint128",
      "name": "accSushiPerShare",
      "type": "uint128"
    },
    {
      "internalType": "uint64",
      "name": "lastRewardBlock",
      "type": "uint64"
    },
    {
      "internalType": "uint64",
      "name": "allocPoint",
      "type": "uint64"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}

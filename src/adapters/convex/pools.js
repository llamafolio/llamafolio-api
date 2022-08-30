import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { getERC20Details, getERC20Balances } from "@lib/erc20";

import BoosterAbi from "./abis/Booster.json";


export async function getAllPools() {
  const chain = "ethereum";
  const provider = providers["ethereum"];

  const booster = new ethers.Contract(
    "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
    BoosterAbi,
    provider
  );

  const poolCount = await booster.poolLength()

  let calls = [];
  for (let index = 0; index < poolCount.toNumber(); index++) {
    calls.push({
      params: [index],
      target: booster.address,
    });
  }


  const poolInfoRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"poolInfo","outputs":[{"internalType":"address","name":"lptoken","type":"address"},{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"gauge","type":"address"},{"internalType":"address","name":"crvRewards","type":"address"},{"internalType":"address","name":"stash","type":"address"},{"internalType":"bool","name":"shutdown","type":"bool"}],"stateMutability":"view","type":"function"},
  });

  const poolInfo = poolInfoRes
    .filter((res) => res.success)
    .map((res) => res.output);

  let tokens = poolInfo.map((r) => (r.lptoken));
  const tokenDetails = await getERC20Details(chain, tokens);


  const formattedPools = poolInfo.map((address, i) => ({
    name: `cvx${tokenDetails[i].symbol}`,
    dName: `${tokenDetails[i].symbol} Convex Pool`,
    chain: "ethereum",
    type: "stake",
    address: address.token,
    lptoken: address.lptoken,
    crvRewards: address.crvRewards
  }));

  return formattedPools;
}

export async function getPoolBalances(ctx, chain, contracts) {


  const addresses = contracts.map((r) => (r.crvRewards));


  let calls = [];
  for (let index = 0; index < contracts.length; index++) {
    calls.push({
      params: [ctx.address],
      target: contracts[index].crvRewards,
    });
  }


  const balancesRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
      constant: true,
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const balancesR = balancesRes
    .filter((res) => res.success)
    .map((res) => res.output);

  let balances = []
  for (var i = 0; i < contracts.length; i++) {
    balances.push({
      chain: chain,
      category: "stake",
      symbol: contracts[i].name,
      decimals: 18,
      address: contracts[i].crvRewards,
      priceSubstitute: contracts[i].lptoken,
      amount: BigNumber.from(balancesR[i] > 0 ? balancesR[i] : 0),
    });
  }

  //add crv/cvx rewards

  return balances
}

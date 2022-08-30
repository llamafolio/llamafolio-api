import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { getERC20Details, getERC20Balances } from "@lib/erc20";

import BoosterAbi from "./abis/Booster.json";
import PoolAbi from "./abis/Pool.json";
import RewardPoolAbi from "./abis/VirtualBalanceRewardPool.json"



const CVX = "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b"



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
  const provider = providers[chain];


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


  const earnedRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:{
        "inputs": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          }
        ],
        "name": "earned",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
  });

  const earnedR = earnedRes
    .filter((res) => res.success)
    .map((res) => res.output);


  calls = [];
  for (let index = 0; index < contracts.length; index++) {
    calls.push({
      params: [],
      target: contracts[index].crvRewards,
    });
  }

  const extraRewardsRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:  {
        "inputs": [],
        "name": "extraRewardsLength",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
  });

  const extraRewards = extraRewardsRes
    .filter((res) => res.success)
    .map((res) => res.output);

  let balances = []
  const ratios = await getCVXRatio(provider)
    console.log(ratios[0].toString(), 'ratios')
    console.log(ratios, 'ratios')

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



    if (earnedR[i] > 0) {

      const pendingCRV = BigNumber.from(earnedR[i] > 0 ? earnedR[i] : 0)
      balances.push({
        chain: chain,
        category: "stake-rewards",
        symbol: "CRV",
        decimals: 18,
        parent: contracts[i].crvRewards,
        address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        amount: pendingCRV,
      });
      balances.push({
        chain: chain,
        category: "stake-rewards",
        symbol: "CVX",
        decimals: 18,
        parent: contracts[i].crvRewards,
        address: CVX,
        amount: pendingCRV.mul(ratios[0]).div(ratios[1]),
      });

      const pool = new ethers.Contract(
        contracts[i].crvRewards,
        PoolAbi,
        provider
      );

      if (extraRewards[i] > 0) {
        const extraRewardsAddresses = []
        for (var d = 0; d < extraRewards[i]; d++) {
          const poolReward = new ethers.Contract(
            await pool.extraRewards(d),
            RewardPoolAbi,
            provider
          );

           const earnedBalance = await poolReward.earned(ctx.address)

          if (earnedBalance > 0) {
            const rDetails = await getERC20Details(chain, [ await poolReward.rewardToken() ])
            balances.push({
              chain: chain,
              category: "stake-rewards",
              symbol:  rDetails[0].symbol,
              decimals: rDetails[0].decimals,
              parent: contracts[i].crvRewards,
              address: rDetails[0].address,
              amount: BigNumber.from(earnedBalance),
            });
          }

        }
      }
    }
  }

  return balances
}

//CALCULATE THE RATIO OF CRV:CVX MINTED
async function getCVXRatio(provider) {

  const ERC20Abi = [
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const CVX_EMISSION_CLIFF_DISTANCE = 1e5;
  const CVX_EMISSION_TOTAL_CLIFFS = 1e3;
  const CVX_MAX_SUPPLY = 1e8;
  const CVX_DECIMALS = 1e18;
  const token = new ethers.Contract(
    CVX,
    ERC20Abi,
    provider
  );
  const SUPPLY = ( await token.totalSupply() ) / 10 ** 18
  const currentCliff = SUPPLY / CVX_EMISSION_CLIFF_DISTANCE;
  const remainingCvxUntilMaxSupply = CVX_MAX_SUPPLY - SUPPLY

  if (currentCliff > CVX_EMISSION_TOTAL_CLIFFS) {
    return [0,1]; //cvx rewards will be 0
  }
  console.log(CVX_EMISSION_TOTAL_CLIFFS, 'CVX_EMISSION_TOTAL_CLIFFS')
  console.log(currentCliff, 'currentCliff')
  const reduction = CVX_EMISSION_TOTAL_CLIFFS - currentCliff
  return [reduction.toFixed(2) * 100, CVX_EMISSION_TOTAL_CLIFFS * 100] //*100 cause bignumber is a bitch


}

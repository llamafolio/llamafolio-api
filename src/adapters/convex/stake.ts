import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { getERC20Details, getERC20Balances } from "@lib/erc20";
import { getCVXRatio } from "./pools";

import StakerAbi from "./abis/Staker.json";
import LockerAbi from "./abis/Locker.json";

const CVX = "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b";

export async function getStakeBalances(ctx, chain, contracts) {
  const provider = providers[chain];
  const balances = [];
  for (var i = 0; i < contracts.length; i++) {
    const contract = contracts[i];

    if (contract.name === "cvxCRVStaker") {
      const cvxCRVStaker = new ethers.Contract(
        contract.address,
        StakerAbi,
        provider
      );

      const stakedBalance = await cvxCRVStaker.balanceOf(ctx.address);

      balances.push({
        chain: chain,
        category: "stake",
        symbol: "cvxCRV",
        decimals: 18,
        address: contract.address,
        priceSubstitute: "0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7",
        amount: BigNumber.from(stakedBalance),
        newYieldKey: "ef32dd3b-a03b-4f79-9b65-8420d7e04ad0",
      });

      const crvBalance = await cvxCRVStaker.earned(ctx.address);

      balances.push({
        chain: chain,
        category: "rewards",
        symbol: "CRV",
        decimals: 18,
        address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        amount: BigNumber.from(crvBalance),
        parent: contract.address,
      });

      const ratios = await getCVXRatio(provider);
      balances.push({
        chain: chain,
        category: "rewards",
        symbol: "CVX",
        decimals: 18,
        address: CVX,
        amount: crvBalance.mul(ratios[0]).div(ratios[1]),
        parent: contract.address,
      });

      const threeCRVBalance = await cvxCRVStaker.rewards(ctx.address);
      balances.push({
        chain: chain,
        category: "rewards",
        symbol: "3CRV",
        decimals: 18,
        address: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        amount: threeCRVBalance,
        parent: contract.address,
      });
    }

    if (contract.name === "Locker") {
      const cvxLocker = new ethers.Contract(
        contract.address,
        LockerAbi,
        provider
      );

      const lockedBalance = await cvxLocker.balanceOf(ctx.address);
      balances.push({
        chain: chain,
        category: "lock",
        symbol: "CVX",
        decimals: 18,
        address: contract.address,
        priceSubstitute: CVX,
        amount: BigNumber.from(lockedBalance),
      });

      const claimableRewards = await cvxLocker.claimableRewards(ctx.address);

      const checkTokens = claimableRewards.map((t) => {
        return t.token;
      });

      const tokens = await getERC20Details(chain, checkTokens);

      for (var rrr = 0; rrr < claimableRewards.length; rrr++) {
        const aReward = claimableRewards[i];
        balances.push({
          chain: chain,
          category: "rewards",
          symbol: tokens[rrr].symbol,
          decimals: tokens[rrr].decimals,
          address: aReward.token,
          amount: BigNumber.from(aReward.amount),
          parent: contract.address,
        });
      }
    }
  }

  return balances;
}

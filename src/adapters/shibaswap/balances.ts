import { Contract } from "@lib/adapter";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { returnMasterChefDetails } from "@lib/masterchef/index";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";

import LockerAbi from "./abis/Locker.json";
import StakerAbi from "./abis/Staker.json";
import { BaseContext } from "@lib/adapter";

export async function getBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const provider = providers[chain];
  const balances = [];

  for (let index = 0; index < contracts.length; index++) {
    const contract = contracts[index];

    if (contract.name === "locker") {
      const Locker = new ethers.Contract(contract.address, LockerAbi, provider);

      const remainingLocker = await Locker.unclaimedTokensByUser(ctx.address);

      balances.push({
        chain: chain,
        category: "lock",
        symbol: "BONE",
        decimals: 18,
        address: "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
        amount: BigNumber.from(remainingLocker),
      });
    }

    if (contract.name === "staker") {
      const Staker = new ethers.Contract(contract.address, StakerAbi, provider);

      const stakedBone = await Staker.balanceOf(ctx.address);

      balances.push({
        chain: chain,
        category: "stake",
        symbol: "BONE",
        decimals: 18,
        address: "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
        amount: BigNumber.from(stakedBone),
      });
    }

    if (contract.name === "masterChef") {
      const masterDetails = await returnMasterChefDetails(
        ctx,
        chain,
        contract.address,
        "pendingBone"
      );

      const fetchUnderlyings = [];

      for (let yy = 0; yy < masterDetails.length; yy++) {
        const masterRow = masterDetails[yy];
        balances.push({
          chain: chain,
          category: "lp",
          symbol: masterRow.token.symbol,
          decimals: masterRow.token.decimals,
          address: masterRow.token.address,
          amount: BigNumber.from(masterRow.amount),
        });

        fetchUnderlyings.push({
          ...masterRow.token,
          amount: BigNumber.from(masterRow.amount),
        });

        if (masterRow.rewardsPending > 0) {
          balances.push({
            chain: chain,
            category: "rewards",
            symbol: "BONE",
            decimals: 18,
            address: "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
            amount: BigNumber.from(masterRow.rewardsPending),
            reward: true,
            parent: masterRow.token.address,
          });
        }
      }

      const underlyingBalances = await getUnderlyingBalances(
        chain,
        fetchUnderlyings
      );

      for (let t = 0; t < balances.length; t++) {
        const underlyingDetail = underlyingBalances.find(
          (o) => o.address.toLowerCase() === balances[t].address.toLowerCase()
        );
        if (underlyingDetail) {
          balances[t].underlyingDetails = underlyingDetail.details;
        }
      }
    }
  }

  return balances;
}

import { ethers, BigNumber } from "ethers";
import { Contract, BaseContext } from "@lib/adapter";
import { providers } from "@lib/providers";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { Token } from "@lib/token";

import LockerAbi from "./abis/Locker.json";
import StakerAbi from "./abis/Staker.json";
import { Chain } from "@lib/chains";

const bone: Token = {
  chain: "ethereum",
  symbol: "BONE",
  decimals: 18,
  address: "0x9813037ee2218799597d83d4a5b6f3b6778218d9",
};

export async function getStakerBalances(
  ctx: BaseContext,
  chain: Chain,
  address: string
) {
  const provider = providers[chain];
  const Staker = new ethers.Contract(address, StakerAbi, provider);

  const stakedBone = await Staker.balanceOf(ctx.address);

  return [
    {
      ...bone,
      category: "stake",
      amount: BigNumber.from(stakedBone),
    },
  ];
}

export async function getLockerBalances(
  ctx: BaseContext,
  chain: Chain,
  address: string
) {
  const provider = providers[chain];
  const Locker = new ethers.Contract(address, LockerAbi, provider);

  const remainingLocker = await Locker.unclaimedTokensByUser(ctx.address);

  return [
    {
      ...bone,
      category: "lock",
      amount: BigNumber.from(remainingLocker),
    },
  ];
}

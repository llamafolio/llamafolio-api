import { ethers, BigNumber } from "ethers";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import LockerABI from "./abis/Locker.json";
import FeeDistributorAbi from "./abis/FeeDistributor.json";
import { providers } from "@lib/providers";
import { Chain } from "@lib/chains";

export const lockerContract: Contract = {
  chain: "ethereum",
  address: "0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2",
  name: "Locker",
};

export const feeDistributorContract: Contract = {
  chain: "ethereum",
  address: "0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc",
  name: "FeeDistributor",
};

export async function getLockedBalances(
  ctx: BaseContext,
  chain: Chain,
  lockerAddress: string,
  feeDistributorAddress: string
): Promise<Balance> {
  const provider = providers["ethereum"];

  const locker = new ethers.Contract(lockerAddress, LockerABI, provider);

  const feeDistributor = new ethers.Contract(
    feeDistributorAddress,
    FeeDistributorAbi,
    provider
  );

  const [lockedBalance, claimableBalance] = await Promise.all([
    locker.locked(ctx.address),
    feeDistributor.claim(ctx.address),
  ]);

  return {
    chain,
    category: "lock",
    symbol: "CRV",
    decimals: 18,
    address: "0xd533a949740bb3306d119cc777fa900ba034cd52",
    amount: BigNumber.from(lockedBalance.amount),
    rewards: [
      {
        chain,
        symbol: "3CRV",
        decimals: 18,
        address: "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490",
        amount: BigNumber.from(claimableBalance),
      },
    ],
  };
}

import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import LockerABI from "./abis/Locker.json";
import FeeDistributorAbi from "./abis/FeeDistributor.json";
import { Balance, BaseContext, Contract } from "@lib/adapter";

export const lockerContracts: { [chain: string]: { [key: string]: Contract } } =
  {
    ethereum: {
      locker: {
        chain: "ethereum",
        address: "0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2",
        name: "Locker",
      },
      feeDistributor: {
        chain: "ethereum",
        address: "0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc",
        name: "FeeDistributor",
      },
    },
  };

export function getLockerContracts() {
  const contracts: Contract[] = [];

  for (const chain in lockerContracts) {
    for (const key in lockerContracts[chain]) {
      contracts.push(lockerContracts[chain][key]);
    }
  }

  return contracts;
}

export async function getLockedBalances(
  ctx: BaseContext,
  chain: Chain
): Promise<Balance> {
  const provider = providers["ethereum"];

  const locker = new ethers.Contract(
    "0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2",
    LockerABI,
    provider
  );

  const feeDistributor = new ethers.Contract(
    "0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc",
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

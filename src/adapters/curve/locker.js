import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { getGauges } from "./gauges";
import LockerABI from "./abis/Locker.json";
import FeeDistributorAbi from "./abis/FeeDistributor.json";

export async function getLockedBalances(ctx, chain) {
  const provider = providers["ethereum"];

  const locker = new ethers.Contract(
    "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    LockerABI,
    provider
  );

  const feeDistributor = new ethers.Contract(
    "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc",
    FeeDistributorAbi,
    provider
  );

  const lockedBalance = await locker.locked(ctx.address);
  const claimableBalance = await feeDistributor.claim(ctx.address);

  return [
    {
      chain,
      category: "locked",
      symbol: "CRV",
      decimals: 18,
      address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
      amount: BigNumber.from(lockedBalance.amount),
    },
    {
      chain,
      category: "locked",
      symbol: "3CRV",
      decimals: 18,
      address: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
      amount: BigNumber.from(claimableBalance),
      reward: true,
      parent: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    },
  ];
}

import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";

import LockerAbi from "./abis/Locker.json";

export async function getBalances(ctx, chain, contracts) {

  const balances  = []
  const provider = providers[chain]

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];

    if (contract.name === "vectorLocker") {

      const Locker = new ethers.Contract(
        contract.address,
        LockerAbi,
        provider
      );

      const depositCount = await Locker.getUserDepositLength(ctx.address)

      let calls = []
      for (let index = 0; index < depositCount; index++) {
        calls.push({
          params: [ctx.address, index],
          target: contract.address
        })
      }

      const lockedBalancesRes = await multicall({
        chain: chain,
        calls: calls,
        abi: {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"n","type":"uint256"}],"name":"getUserNthDeposit","outputs":[{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},
      });

      const lockedBalances = lockedBalancesRes
        .filter((res) => res.success)
        .map((res) => res.output);

      for (let c = 0; c < lockedBalances.length; c++) {
        const lockedBalance = lockedBalances[c];

        balances.push({
          chain: chain,
          category: "lock",
          symbol: "VTX",
          decimals: 18,
          address: "0x5817d4f0b62a59b17f75207da1848c2ce75e7af4",
          amount: BigNumber.from(lockedBalance.amount),
          lockEnd: lockedBalance.endTime,
          yieldsKey: `vector-VTX-locking`
        });

      }

    }



  }

  return balances;

}
